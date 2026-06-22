// Serviço — Ficha de tratamento (treatment_records). RLS por tenant.
import { createClient } from '@/lib/supabase/client'
import { getTenantId }  from '@/lib/supabase/getTenantId'
import { registarAuditoria } from '@/services/audit'
import type { CriarTratamentoInput } from '@/lib/validators/tratamento'

export interface RegistoTratamento {
  id:           string
  service_id:   string | null
  performed_at: string
  notes:        string | null
  products:     string | null
  service?:     { name: string } | null
}

export async function listarTratamentosCliente(clientId: string): Promise<RegistoTratamento[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('treatment_records')
    .select('id, service_id, performed_at, notes, products, service:services(name)')
    .eq('client_id', clientId)
    .order('performed_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(`Erro ao carregar tratamentos: ${error.message}`)
  return (data ?? []) as unknown as RegistoTratamento[]
}

export async function criarTratamento(input: CriarTratamentoInput): Promise<void> {
  const supabase  = createClient()
  const tenant_id = await getTenantId()
  const { error } = await supabase.from('treatment_records').insert({
    tenant_id,
    client_id:    input.client_id,
    service_id:   input.service_id || null,
    performed_at: input.performed_at ? new Date(input.performed_at + 'T12:00:00').toISOString() : new Date().toISOString(),
    notes:        input.notes?.trim() || null,
    products:     input.products?.trim() || null,
  })
  if (error) throw new Error(`Erro ao registar tratamento: ${error.message}`)
  await registarAuditoria('treatment.create', { table: 'treatment_records', recordId: input.client_id })
}

export async function apagarTratamento(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('treatment_records').delete().eq('id', id)
  if (error) throw new Error(error.message)
  await registarAuditoria('treatment.delete', { table: 'treatment_records', recordId: id })
}
