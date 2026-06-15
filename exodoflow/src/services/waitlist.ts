// Serviço — Lista de espera. RLS limita ao tenant do utilizador (migração 0039).
import { createClient } from '@/lib/supabase/client'
import { getTenantId }  from '@/lib/supabase/getTenantId'
import { registarAuditoria } from '@/services/audit'
import type { Database } from '@/types/database'
import type { CriarWaitlistInput, WaitlistStatus } from '@/lib/validators/waitlist'

type WaitlistRow = Database['public']['Tables']['waitlist']['Row']

// Entrada da lista de espera com nomes resolvidos (cliente, serviço, profissional).
export interface WaitlistEntry extends WaitlistRow {
  client?:   { full_name: string } | null
  service?:  { name: string } | null
  resource?: { name: string } | null
}

// Lista as entradas (mais recentes primeiro). Por defeito esconde canceladas.
export async function listarWaitlist(incluirFinalizadas = false): Promise<WaitlistEntry[]> {
  const supabase = createClient()
  let q = supabase
    .from('waitlist')
    .select('*, client:clients(full_name), service:services(name), resource:resources(name)')
    .order('created_at', { ascending: true })
    .limit(500)
  if (!incluirFinalizadas) q = q.in('status', ['waiting', 'contacted'])

  const { data, error } = await q
  if (error) throw new Error(`Erro ao listar lista de espera: ${error.message}`)
  return (data ?? []) as WaitlistEntry[]
}

// Adiciona um cliente à lista de espera.
export async function criarWaitlist(input: CriarWaitlistInput): Promise<void> {
  const supabase = createClient()
  const tenant_id = await getTenantId()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('waitlist')
    .insert({
      tenant_id,
      client_id:      input.client_id || null,
      contact_name:   input.contact_name?.trim() || null,
      contact_phone:  input.contact_phone?.trim() || null,
      service_id:     input.service_id || null,
      resource_id:    input.resource_id || null,
      preferred_from: input.preferred_from || null,
      notes:          input.notes?.trim() || null,
      created_by:     user?.id ?? null,
    })
    .select('id')
    .single()
  if (error) throw new Error(`Erro ao adicionar à lista de espera: ${error.message}`)
  await registarAuditoria('waitlist.create', { table: 'waitlist', recordId: data.id })
}

// Atualiza o estado de uma entrada (contactado / agendado / cancelado).
export async function atualizarStatusWaitlist(id: string, status: WaitlistStatus): Promise<void> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('waitlist')
    .update({ status })
    .eq('id', id)
    .select('id')
  if (error) throw new Error(`Erro ao atualizar estado: ${error.message}`)
  if (!data?.length) throw new Error('Entrada não encontrada ou sem permissão.')
  await registarAuditoria('waitlist.update', { table: 'waitlist', recordId: id, metadata: { status } })
}

// Remove uma entrada da lista de espera.
export async function removerWaitlist(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('waitlist').delete().eq('id', id)
  if (error) throw new Error(`Erro ao remover da lista de espera: ${error.message}`)
  await registarAuditoria('waitlist.delete', { table: 'waitlist', recordId: id })
}
