// POST /api/lembretes/processar — processa lembretes de marcações próximas.
// Autenticado. Permissão: agenda.create (front-desk: owner/manager/receptionist).
// Simulado até o WhatsApp real estar ligado (WHATSAPP_OUTBOUND_MOCK).
// tenant_id vem SEMPRE da sessão. Pronto para ser chamado por um cron depois.
import { NextResponse }      from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { canAccess }         from '@/lib/permissions'
import { checkRateLimit, clientKeyFromRequest } from '@/lib/rate-limit'
import { processarLembretes } from '@/services/lembretes'
import { logger }            from '@/lib/logger'
import type { AppRole }      from '@/types/domain/permission'

export async function POST(request: Request) {
  const rl = checkRateLimit(`lembretes:${clientKeyFromRequest(request)}`, { limit: 20, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Demasiados pedidos.' }, { status: 429, headers: rl.headers })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('id, role, tenant_id').eq('id', user.id).single()
  if (!profile?.tenant_id) return NextResponse.json({ error: 'Tenant não identificado.' }, { status: 400 })
  if (!canAccess(profile.role as AppRole, 'agenda.create')) {
    return NextResponse.json({ error: 'Sem permissão para processar lembretes.' }, { status: 403 })
  }

  try {
    const r = await processarLembretes(profile.tenant_id)
    await supabase.rpc('record_audit_log', {
      p_action:     'booking.lembretes',
      p_table_name: 'communication_logs',
      p_record_id:  null,
      p_metadata:   { enviados: r.enviados, ignorados: r.ignorados, mock: r.mock },
    })
    return NextResponse.json({ ok: true, ...r }, { status: 200 })
  } catch (e) {
    logger.error('Erro ao processar lembretes', { erro: e instanceof Error ? e.message : String(e) })
    return NextResponse.json({ error: 'Erro ao processar lembretes.' }, { status: 500 })
  }
}
