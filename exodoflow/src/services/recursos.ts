// Serviço de acesso a dados — Recursos (colaboradores, salas, equipamentos)
import { createClient } from '@/lib/supabase/client'
import { getTenantId }  from '@/lib/supabase/getTenantId'
import { assertMutationSuccess } from '@/lib/supabase/assertMutationSuccess'
import type { CriarRecursoInput, AtualizarRecursoInput } from '@/lib/validators/resource'

// Busca todos os recursos activos do tenant ordenados por nome
// .eq('is_active', true) — exclui recursos desactivados administrativamente
// .is('deleted_at', null) — exclui recursos soft-deleted (RGPD / remoção lógica)
// Sem estes filtros, recursos inactivos aparecem no seletor de slots do Nova Marcação
export async function listarRecursos() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name', { ascending: true })
    .limit(500)   // protecção contra payloads gigantes (recursos por tenant são poucos)

  if (error) throw new Error(`Erro ao listar recursos: ${error.message}`)
  return data
}

// Busca um recurso pelo ID
// .is('deleted_at', null) — impede recuperar um recurso soft-deleted
export async function buscarRecursoPorId(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) throw new Error(`Recurso não encontrado: ${error.message}`)
  return data
}

// A especialização vive em metadata.specialization (neste código metadata só
// guarda essa chave, por isso é seguro reescrever o objecto inteiro).
function metadataDe(specialization?: string) {
  return specialization ? { specialization } : {}
}

// Cria um novo recurso
export async function criarRecurso(input: CriarRecursoInput) {
  const supabase  = createClient()
  const tenant_id = await getTenantId()

  const { data, error } = await supabase
    .from('resources')
    .insert({
      tenant_id,
      name:      input.name,
      type:      input.type,
      color:     input.color,
      metadata:  metadataDe(input.specialization || undefined),
      is_active: true,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Erro ao criar recurso: ${error.message}`)
  return data
}

// Actualiza um recurso existente
// .is('deleted_at', null) — impede actualizar um recurso já soft-deleted
export async function atualizarRecurso(id: string, input: AtualizarRecursoInput) {
  const supabase = createClient()

  const patch: Record<string, unknown> = {}
  if (input.name  !== undefined) patch.name  = input.name
  if (input.type  !== undefined) patch.type  = input.type
  if (input.color !== undefined) patch.color = input.color
  if (input.specialization !== undefined) patch.metadata = metadataDe(input.specialization || undefined)

  const { data, error } = await supabase
    .from('resources')
    .update(patch)
    .eq('id', id)
    .is('deleted_at', null)
    .select('id')

  assertMutationSuccess(data, error, 'actualizar recurso')
}

// Apaga (soft-delete) um recurso via RPC soft_delete_resource.
// O RPC (SECURITY DEFINER) valida tenant + role e marca deleted_at + is_active=false.
// Soft-delete preserva o histórico: marcações antigas que usam o recurso
// continuam válidas.
export async function apagarRecurso(id: string) {
  const supabase = createClient()
  const { error } = await supabase.rpc('soft_delete_resource', { p_id: id })
  if (error) throw new Error(`Erro ao apagar recurso: ${error.message}`)
}
