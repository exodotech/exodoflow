// Serviço — Horários de trabalho (resource_availability) e Folgas/Bloqueios
// (resource_blocks) de um recurso. RLS: leitura por tenant; escrita owner/manager
// (availability) e qualquer membro (insert de blocks). O motor de slots
// (get_available_slots) já respeita ambos.
import { createClient } from '@/lib/supabase/client'
import { getTenantId }  from '@/lib/supabase/getTenantId'
import { registarAuditoria } from '@/services/audit'

// ── Tipos ────────────────────────────────────────────────────────────────────
export interface FranjaHorario {
  day_of_week: number    // 0=domingo … 6=sábado
  start_time:  string    // 'HH:MM'
  end_time:    string    // 'HH:MM'
}

export interface BloqueioRecurso {
  id:        string
  start_at:  string
  end_at:    string
  reason:    string | null
}

// ── Horários de trabalho (resource_availability) ─────────────────────────────

export async function listarDisponibilidade(resourceId: string): Promise<FranjaHorario[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('resource_availability')
    .select('day_of_week, start_time, end_time')
    .eq('resource_id', resourceId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })
  if (error) throw new Error(`Erro ao carregar horários: ${error.message}`)
  // a BD devolve 'HH:MM:SS' — normalizar para 'HH:MM'
  return (data ?? []).map((r) => ({
    day_of_week: r.day_of_week,
    start_time:  String(r.start_time).slice(0, 5),
    end_time:    String(r.end_time).slice(0, 5),
  }))
}

// Substitui TODO o horário do recurso pelas franjas indicadas (estratégia de
// replace — simples e fiável para um editor semanal). Owner/manager only (RLS).
export async function definirDisponibilidade(resourceId: string, franjas: FranjaHorario[]): Promise<void> {
  const supabase  = createClient()
  const tenant_id = await getTenantId()

  // 1. apagar o existente do recurso
  const { error: delErr } = await supabase
    .from('resource_availability').delete().eq('resource_id', resourceId)
  if (delErr) throw new Error(`Erro ao limpar horários: ${delErr.message}`)

  // 2. inserir as novas franjas (se houver)
  if (franjas.length > 0) {
    const linhas = franjas.map((f) => ({
      tenant_id, resource_id: resourceId,
      day_of_week: f.day_of_week, start_time: f.start_time, end_time: f.end_time,
    }))
    const { error: insErr } = await supabase.from('resource_availability').insert(linhas)
    if (insErr) throw new Error(`Erro ao guardar horários: ${insErr.message}`)
  }

  await registarAuditoria('resource.availability_update', { table: 'resource_availability', recordId: resourceId })
}

// ── Folgas / Bloqueios (resource_blocks) ─────────────────────────────────────

export async function listarBloqueios(resourceId: string): Promise<BloqueioRecurso[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('resource_blocks')
    .select('id, start_at, end_at, reason')
    .eq('resource_id', resourceId)
    .order('start_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(`Erro ao carregar folgas: ${error.message}`)
  return (data ?? []) as BloqueioRecurso[]
}

export async function criarBloqueio(resourceId: string, input: { start_at: string; end_at: string; reason?: string }): Promise<void> {
  const supabase  = createClient()
  const tenant_id = await getTenantId()
  const { error } = await supabase.from('resource_blocks').insert({
    tenant_id, resource_id: resourceId,
    start_at: input.start_at, end_at: input.end_at,
    reason: input.reason?.trim() || null,
  })
  if (error) throw new Error(`Erro ao criar folga: ${error.message}`)
  await registarAuditoria('resource.block_create', { table: 'resource_blocks', recordId: resourceId })
}

export async function apagarBloqueio(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('resource_blocks').delete().eq('id', id)
  if (error) throw new Error(`Erro ao remover folga: ${error.message}`)
  await registarAuditoria('resource.block_delete', { table: 'resource_blocks', recordId: id })
}
