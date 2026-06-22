// Serviço de acesso a dados — Serviços do catálogo
import { createClient } from '@/lib/supabase/client'
import { getTenantId }  from '@/lib/supabase/getTenantId'
import type { CriarServicoInput, AtualizarServicoInput } from '@/lib/validators/service'

// Busca todos os serviços activos do tenant (RLS garante isolamento)
// .eq('is_active', true) — exclui serviços desactivados administrativamente
// .is('deleted_at', null) — exclui serviços soft-deleted; sem este filtro serviços apagados aparecem no catálogo e nos selectores
export async function listarServicos() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .limit(500)   // protecção contra payloads gigantes (serviços por tenant são poucos)

  if (error) throw new Error(`Erro ao listar serviços: ${error.message}`)
  return data
}

// Cria um novo serviço no catálogo do tenant
export async function criarServico(input: CriarServicoInput) {
  const supabase  = createClient()
  const tenant_id = await getTenantId()

  const { data, error } = await supabase
    .from('services')
    .insert({
      tenant_id,
      name:                   input.name,
      description:            input.description || null,
      duration_minutes:       input.duration_minutes,
      price:                  input.price ?? null,
      color:                  input.color,
      requires_resource_type: input.requires_resource_type || null,
      is_active:              true,
    })
    .select()
    .single()

  if (error) throw new Error(`Erro ao criar serviço: ${error.message}`)
  return data
}

// Actualiza dados de um serviço existente
// .is('deleted_at', null) — impede actualizar um serviço já soft-deleted
export async function atualizarServico(id: string, input: AtualizarServicoInput) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('services')
    .update(input)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single()

  if (error) throw new Error(`Erro ao actualizar serviço: ${error.message}`)
  return data
}

// Apaga (soft-delete) um serviço via RPC soft_delete_service.
// O RPC (SECURITY DEFINER) valida tenant + role e marca deleted_at + is_active=false.
// Soft-delete preserva o histórico: marcações antigas que referenciam o serviço
// continuam válidas.
export async function apagarServico(id: string) {
  const supabase = createClient()
  const { error } = await supabase.rpc('soft_delete_service', { p_id: id })
  if (error) throw new Error(`Erro ao apagar serviço: ${error.message}`)
}
