// Serviço de disponibilidade — wrapper para a RPC get_available_slots
// REGRA ARQUITECTURAL: a IA APENAS chama esta função.
// A IA NUNCA consulta directamente: bookings, resource_blocks, resource_availability.
import { createClient } from '@/lib/supabase/client'

export interface SlotDisponivel {
  resource_id: string
  slot_start:  string
  slot_end:    string
}

export interface BuscarSlotsParams {
  tenant_id:              string
  resource_ids:           string[]
  service_id:             string
  start_date:             string   // 'YYYY-MM-DD'
  end_date:               string   // 'YYYY-MM-DD'
  slot_interval_minutes?: number
}

export async function buscarSlotsDisponiveis(
  params: BuscarSlotsParams
): Promise<SlotDisponivel[]> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_available_slots', {
    p_tenant_id:             params.tenant_id,
    p_resource_ids:          params.resource_ids,
    p_service_id:            params.service_id,
    p_start_date:            params.start_date,
    p_end_date:              params.end_date,
    p_slot_interval_minutes: params.slot_interval_minutes ?? 15,
  })

  if (error) throw new Error(`Erro ao buscar horários disponíveis: ${error.message}`)
  return (data ?? []) as SlotDisponivel[]
}
