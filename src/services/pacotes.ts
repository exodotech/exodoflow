// Serviço — Pacotes de sessões (client_packages). RLS garante isolamento por
// tenant; o consumo de sessão usa o RPC atómico consumir_sessao_pacote.
import { createClient } from '@/lib/supabase/client'
import { getTenantId }  from '@/lib/supabase/getTenantId'
import { registarAuditoria } from '@/services/audit'
import type { CriarPacoteInput } from '@/lib/validators/pacote'

export interface PacoteCliente {
  id:             string
  client_id:      string
  service_id:     string | null
  name:           string
  total_sessions: number
  used_sessions:  number
  price:          number | null
  status:         string
  expires_at:     string | null
  purchased_at:   string
  service?:       { name: string } | null
}

// Lista os pacotes de um cliente (mais recentes primeiro), com nome do serviço.
export async function listarPacotesCliente(clientId: string): Promise<PacoteCliente[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('client_packages')
    .select('id, client_id, service_id, name, total_sessions, used_sessions, price, status, expires_at, purchased_at, service:services(name)')
    .eq('client_id', clientId)
    .order('purchased_at', { ascending: false })
    .limit(50)
  if (error) throw new Error(`Erro ao carregar pacotes: ${error.message}`)
  return (data ?? []) as unknown as PacoteCliente[]
}

// Cria um pacote para o cliente.
export async function criarPacote(input: CriarPacoteInput): Promise<void> {
  const supabase  = createClient()
  const tenant_id = await getTenantId()
  const { error } = await supabase.from('client_packages').insert({
    tenant_id,
    client_id:      input.client_id,
    service_id:     input.service_id || null,
    name:           input.name.trim(),
    total_sessions: input.total_sessions,
    price:          input.price ?? null,
    expires_at:     input.expires_at || null,
  })
  if (error) throw new Error(`Erro ao criar pacote: ${error.message}`)
  await registarAuditoria('package.create', { table: 'client_packages', recordId: input.client_id })
}

// Desconta 1 sessão (atómico via RPC). Devolve o pacote atualizado.
export async function consumirSessao(packageId: string): Promise<PacoteCliente> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('consumir_sessao_pacote', { p_package_id: packageId })
  if (error) throw new Error(error.message)
  await registarAuditoria('package.consume', { table: 'client_packages', recordId: packageId })
  return data as unknown as PacoteCliente
}

// Cancela um pacote (status='cancelled').
export async function cancelarPacote(packageId: string): Promise<void> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('client_packages').update({ status: 'cancelled' }).eq('id', packageId).select('id')
  if (error) throw new Error(error.message)
  if (!data?.length) throw new Error('Pacote não encontrado ou sem permissão.')
  await registarAuditoria('package.cancel', { table: 'client_packages', recordId: packageId })
}
