// Serviço de Lembretes de marcação — SERVER-SIDE apenas.
// Encontra marcações próximas (janela configurável) sem lembrete e regista um
// lembrete (simulado até o WhatsApp real estar ligado) em communication_logs.
// Dedup por (booking_id, event_type). Pronto para um cron/WhatsApp real depois.
import { createAdminClient } from '@/lib/supabase/admin'
import { bookingsParaLembrar, corpoLembrete, type BookingLembrete } from '@/lib/lembretes/lembretes'
import { logger } from '@/lib/logger'

const EVENT = 'booking_reminder_24h'

export interface ProcessarLembretesResult {
  enviados:  number
  ignorados: number   // já lembrados / sem janela
  mock:      boolean
}

// Processa os lembretes pendentes de um tenant. tenant_id vem sempre da sessão.
export async function processarLembretes(tenant_id: string): Promise<ProcessarLembretesResult> {
  const admin  = createAdminClient()
  const isMock = process.env.WHATSAPP_OUTBOUND_MOCK !== 'false'

  // Config do tenant: janela (horas) + fuso
  const { data: tenant } = await admin.from('tenants').select('settings').eq('id', tenant_id).single()
  const settings = (tenant?.settings ?? {}) as { timezone?: string; booking?: { reminder_hours?: number } }
  const timezone = settings.timezone ?? 'Europe/Lisbon'
  const janela   = settings.booking?.reminder_hours ?? 24

  const agoraISO = new Date().toISOString()
  const limiteISO = new Date(Date.now() + janela * 60 * 60 * 1000).toISOString()

  // Marcações ativas dentro da janela
  const { data: bookingsRaw, error } = await admin
    .from('bookings')
    .select('id, start_at, status, client_id, client:clients(full_name, phone), service:services(name)')
    .eq('tenant_id', tenant_id)
    .in('status', ['pending', 'confirmed'])
    .gte('start_at', agoraISO)
    .lte('start_at', limiteISO)
    .limit(200)
  if (error) throw new Error(`Erro ao carregar marcações: ${error.message}`)

  const bookings = (bookingsRaw ?? []) as unknown as (BookingLembrete & { client_id: string | null })[]
  if (bookings.length === 0) return { enviados: 0, ignorados: 0, mock: isMock }

  // Lembretes já enviados (dedup)
  const { data: logs } = await admin
    .from('communication_logs')
    .select('booking_id')
    .eq('tenant_id', tenant_id)
    .eq('event_type', EVENT)
    .in('booking_id', bookings.map((b) => b.id))
  const jaLembrados = new Set((logs ?? []).map((l) => l.booking_id as string))

  const aLembrar = bookingsParaLembrar(bookings, agoraISO, janela, jaLembrados)
  if (aLembrar.length === 0) {
    return { enviados: 0, ignorados: bookings.length, mock: isMock }
  }

  // Inserir os lembretes (simulados)
  const linhas = aLembrar.map((b) => {
    const full = b as BookingLembrete & { client_id: string | null }
    return {
      tenant_id,
      booking_id:  b.id,
      client_id:   full.client_id ?? null,
      channel:     'whatsapp',
      event_type:  EVENT,
      recipient:   b.client?.phone ?? '—',
      body:        corpoLembrete(b, timezone),
      status:      isMock ? 'simulated' : 'sent',
      sent_at:     isMock ? null : new Date().toISOString(),
    }
  })
  const { error: insErr } = await admin.from('communication_logs').insert(linhas)
  if (insErr) throw new Error(`Erro ao registar lembretes: ${insErr.message}`)

  logger.info('Lembretes processados', { tenant_id, enviados: linhas.length, mock: isMock })
  return { enviados: linhas.length, ignorados: bookings.length - linhas.length, mock: isMock }
}
