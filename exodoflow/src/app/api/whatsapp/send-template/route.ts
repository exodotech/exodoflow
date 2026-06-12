// POST /api/whatsapp/send-template — envio MANUAL de template operacional (Fase 1C).
// Autenticado. Permissão conversas.reply (OWNER/MANAGER/RECEPTIONIST; STAFF não).
// O tenant vem SEMPRE da sessão (nunca do browser). O envio real corre no serviço
// server-side (access_token nunca chega ao cliente). NÃO há IA, NÃO há automações:
// cada envio é desencadeado manualmente pela equipa a partir da agenda.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canAccess } from '@/lib/permissions'
import { checkRateLimit, clientKeyFromRequest } from '@/lib/rate-limit'
import {
  enviarTemplateWhatsApp,
  TemplateError,
  TEMPLATE_PURPOSES,
} from '@/services/whatsapp-templates'
import { logger } from '@/lib/logger'
import type { AppRole } from '@/types/domain/permission'
import type { TemplatePurpose } from '@/types/domain/communication'

export async function POST(request: Request) {
  // Rate-limit básico
  const rl = checkRateLimit(`wa-tpl:${clientKeyFromRequest(request)}`, { limit: 60, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Demasiados pedidos.' }, { status: 429, headers: rl.headers })

  // 1. Autenticação
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // 2. Role + tenant da BD (NUNCA confiar no browser para o tenant)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, tenant_id')
    .eq('id', user.id)
    .single()
  if (!profile?.tenant_id) return NextResponse.json({ error: 'Tenant não identificado' }, { status: 400 })
  if (!canAccess(profile.role as AppRole, 'conversas.reply')) {
    return NextResponse.json({ error: 'Sem permissão para enviar templates' }, { status: 403 })
  }

  // 3. Validar payload
  let body: { booking_id?: string; template_purpose?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 }) }
  const bookingId = body.booking_id
  const purpose   = body.template_purpose
  if (!bookingId) return NextResponse.json({ error: 'Marcação em falta' }, { status: 400 })
  if (!purpose || !TEMPLATE_PURPOSES.includes(purpose as TemplatePurpose)) {
    return NextResponse.json({ error: 'Propósito de template inválido' }, { status: 400 })
  }

  // 4. Enviar (server-side). O serviço valida booking∈tenant, telefone, template e canal.
  try {
    const res = await enviarTemplateWhatsApp({
      tenant_id:        profile.tenant_id,
      booking_id:       bookingId,
      template_purpose: purpose as TemplatePurpose,
    })

    // Auditoria (acção do utilizador) — actor/tenant do JWT, sem tokens
    await supabase.rpc('record_audit_log', {
      p_action: 'whatsapp.send_template', p_table_name: 'communication_logs',
      p_record_id: res.log_id || null, p_metadata: { booking_id: bookingId, purpose, mock: res.mock },
    })

    return NextResponse.json({ ok: true, log_id: res.log_id, mock: res.mock }, { status: 201 })
  } catch (e) {
    if (e instanceof TemplateError) {
      // 409 para estado (canal/template/telefone/aprovação), 502 para falha de envio
      const status =
        e.code === 'send-failed' ? 502 :
        e.code === 'invalid'     ? 400 : 409
      return NextResponse.json({ error: e.message, code: e.code }, { status })
    }
    logger.error('Erro inesperado no envio de template WhatsApp', { erro: e instanceof Error ? e.message : String(e) })
    return NextResponse.json({ error: 'Erro ao enviar template' }, { status: 500 })
  }
}
