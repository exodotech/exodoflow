// Serviço — Pedidos de titulares (data_subject_requests). RLS: owner/manager.
import { createClient } from '@/lib/supabase/client'
import { getTenantId }  from '@/lib/supabase/getTenantId'
import { registarAuditoria } from '@/services/audit'
import type { Database } from '@/types/database'
import type { CriarDsrInput, DsrStatus } from '@/lib/validators/dsr'

export type DsrRow = Database['public']['Tables']['data_subject_requests']['Row']

export async function listarPedidosDsr(): Promise<DsrRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('data_subject_requests')
    .select('*')
    .order('received_at', { ascending: false })
    .limit(500)
  if (error) throw new Error(`Erro ao listar pedidos: ${error.message}`)
  return (data ?? []) as DsrRow[]
}

export async function criarPedidoDsr(input: CriarDsrInput): Promise<void> {
  const supabase = createClient()
  const tenant_id = await getTenantId()
  const { data, error } = await supabase
    .from('data_subject_requests')
    .insert({
      tenant_id,
      requester_name:  input.requester_name.trim(),
      requester_email: input.requester_email?.trim() || null,
      request_type:    input.request_type,
      notes:           input.notes?.trim() || null,
    })
    .select('id')
    .single()
  if (error) throw new Error(`Erro ao registar pedido: ${error.message}`)
  await registarAuditoria('dsr.create', { table: 'data_subject_requests', recordId: data.id, metadata: { type: input.request_type } })
}

export async function atualizarStatusDsr(id: string, status: DsrStatus): Promise<void> {
  const supabase = createClient()
  const patch: Record<string, unknown> = { status }
  if (status === 'completed' || status === 'rejected') patch.resolved_at = new Date().toISOString()
  const { data, error } = await supabase
    .from('data_subject_requests')
    .update(patch)
    .eq('id', id)
    .select('id')
  if (error) throw new Error(`Erro ao atualizar pedido: ${error.message}`)
  if (!data?.length) throw new Error('Pedido não encontrado ou sem permissão.')
  await registarAuditoria('dsr.update', { table: 'data_subject_requests', recordId: id, metadata: { status } })
}
