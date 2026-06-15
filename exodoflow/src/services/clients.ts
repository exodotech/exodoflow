// Serviço de acesso a dados — Clientes
// Inclui operações RGPD: anonimização e consentimentos
import { createClient }  from '@/lib/supabase/client'
import { getTenantId }   from '@/lib/supabase/getTenantId'
import { registarAuditoria } from '@/services/audit'
import type { CriarClienteInput, AtualizarClienteInput, CriarVisitanteInput } from '@/lib/validators/client'

// Busca todos os clientes activos do tenant (exclui soft-deleted e anónimos)
// .is('deleted_at', null) é obrigatório — sem ele clientes apagados aparecem na lista
export async function listarClientes() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('id, full_name, phone, email, tags, birth_date, gdpr_consent_at, marketing_consent, is_guest, created_at')
    .is('deleted_at', null)
    .eq('is_quick', false)   // esconde o cliente técnico de "Marcação Rápida"
    .order('full_name', { ascending: true })
    .limit(1000)  // protecção contra payloads gigantes; paginação real quando houver busca server-side

  if (error) throw new Error(`Erro ao listar clientes: ${error.message}`)
  return data
}

// Busca um cliente pelo ID
// .is('deleted_at', null) — impede recuperar um cliente já soft-deleted (ex: após RGPD)
export async function buscarClientePorId(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) throw new Error(`Cliente não encontrado: ${error.message}`)
  return data
}

// Cria um novo cliente com registo de consentimento RGPD
export async function criarCliente(input: CriarClienteInput) {
  const supabase  = createClient()
  const tenant_id = await getTenantId()

  const { data, error } = await supabase
    .from('clients')
    .insert({
      tenant_id,
      full_name:         input.full_name,
      phone:             input.phone || null,
      email:             input.email || null,
      birth_date:        input.birth_date || null,
      nif:               input.nif || null,
      notes:             input.notes || null,
      tags:              input.tags && input.tags.length > 0 ? input.tags : null,
      marketing_consent: input.marketing_consent,
      gdpr_consent_at:   input.marketing_consent ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (error) throw new Error(`Erro ao criar cliente: ${error.message}`)
  await registarAuditoria('client.create', { table: 'clients', recordId: data.id })
  return data
}

// Obtém (criando se preciso) o cliente técnico de "Marcação Rápida" do tenant.
// Usado quando se cria uma marcação SEM cliente identificado (atendimento de
// balcão). Não recolhe dados pessoais nem gera consentimento (ver RPC 0033).
export async function obterClienteRapido(): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_or_create_quick_client')
  if (error) throw new Error(`Erro ao preparar marcação rápida: ${error.message}`)
  return data as string
}

// Cria um CLIENTE VISITANTE (cadastro rápido): só nome + telefone opcional.
// is_guest=TRUE. NÃO regista consentimento de marketing nem qualquer outro dado.
// Devolve o cliente criado (o id é usado, p.ex., para uma marcação imediata).
export async function criarVisitante(input: CriarVisitanteInput) {
  const supabase  = createClient()
  const tenant_id = await getTenantId()

  const { data, error } = await supabase
    .from('clients')
    .insert({
      tenant_id,
      full_name: input.full_name,
      phone:     input.phone || null,
      is_guest:  true,
    })
    .select('id, full_name, phone, email, is_guest')
    .single()

  if (error) throw new Error(`Erro ao criar visitante: ${error.message}`)
  await registarAuditoria('guest.create', { table: 'clients', recordId: data.id })
  return data
}

// Converte um visitante em cliente permanente: is_guest=FALSE + carimbo temporal.
// Os restantes dados (e-mail, NIF, consentimento, notas) completam-se a seguir
// pelo fluxo normal de edição — esta operação apenas muda o estado.
export async function converterVisitante(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .update({ is_guest: false, guest_converted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
    .select('id, full_name, phone, email, nif, marketing_consent, is_guest')
    .single()

  if (error) throw new Error(`Erro ao converter visitante: ${error.message}`)
  await registarAuditoria('client.convert', { table: 'clients', recordId: id })
  return data
}

// Lê o trilho de auditoria de consentimento de marketing de um cliente.
// Append-only e imutável (RGPD) — a linha mais recente é o estado actual.
// Apenas owner/manager têm SELECT (policy legal_consents_select_manager_owner).
export async function listarConsentimentosCliente(clientId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('legal_consents')
    .select('id, consent_type, consent_version, consented, consented_at')
    .eq('client_id', clientId)
    .eq('consent_type', 'marketing')
    .order('consented_at', { ascending: false })

  if (error) throw new Error(`Erro ao listar consentimentos: ${error.message}`)
  return data
}

// Apaga (soft-delete) um cliente via RPC soft_delete_client.
// O RPC (SECURITY DEFINER) valida tenant + role e marca deleted_at.
// Preserva o histórico de marcações; não anonimiza (ver anonymize_client/RGPD).
export async function apagarCliente(id: string) {
  const supabase = createClient()
  const { error } = await supabase.rpc('soft_delete_client', { p_id: id })
  if (error) throw new Error(`Erro ao apagar cliente: ${error.message}`)
  await registarAuditoria('client.delete', { table: 'clients', recordId: id })
}

// Actualiza dados de um cliente existente.
// Normaliza strings vazias para null (campos opcionais) e tags vazias para null,
// para não gravar '' numa coluna date (birth_date) nem arrays vazios.
export async function atualizarCliente(id: string, input: AtualizarClienteInput) {
  const supabase = createClient()

  const nl = (v: unknown) => (v === '' || v === undefined ? undefined : v)
  const patch: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input)) {
    if (k === 'tags') { patch.tags = Array.isArray(v) && v.length > 0 ? v : null; continue }
    if (k === 'birth_date' || k === 'nif' || k === 'notes' || k === 'phone' || k === 'email') {
      const n = nl(v); if (n !== undefined) patch[k] = n === '' ? null : n
      continue
    }
    const n = nl(v); if (n !== undefined) patch[k] = n
  }

  const { data, error } = await supabase
    .from('clients')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Erro ao actualizar cliente: ${error.message}`)
  await registarAuditoria('client.update', { table: 'clients', recordId: id })
  return data
}
