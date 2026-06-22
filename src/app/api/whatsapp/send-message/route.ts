// POST /api/whatsapp/send-message — resposta MANUAL humana (Fase 1B).
// Autenticado. Permissão conversas.reply (OWNER/MANAGER/RECEPTIONIST; STAFF não).
// O tenant vem SEMPRE da sessão (nunca do browser). O envio real corre no
// serviço server-side (access_token nunca chega ao cliente).
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canAccess } from '@/lib/permissions'
import { checkRateLimit, clientKeyFromRequest } from '@/lib/rate-limit'
import { enviarMensagemWhatsAppManual, OutboundError } from '@/services/whatsapp-outbound'
import { logger } from '@/lib/logger'
import type { AppRole } from '@/types/domain/permission'

export async function POST(request: Request) {
  // Rate-limit básico
  const rl = checkRateLimit(`wa-send:${clientKeyFromRequest(request)}`, { limit: 60, windowMs: 60_000 })
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
    return NextResponse.json({ error: 'Sem permissão para responder' }, { status: 403 })
  }

  // 3. Validar payload
  let body: { conversation_id?: string; content?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 }) }
  const conversationId = body.conversation_id
  const content = (body.content ?? '').trim()
  if (!conversationId) return NextResponse.json({ error: 'Conversa em falta' }, { status: 400 })
  if (!content) return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })
  if (content.length > 4096) return NextResponse.json({ error: 'Máximo 4096 caracteres' }, { status: 400 })

  // 4. Enviar (server-side). O serviço valida conversa∈tenant, canal activo e janela 24h.
  try {
    const res = await enviarMensagemWhatsAppManual({
      tenant_id:        profile.tenant_id,
      conversation_id:  conversationId,
      content,
      actor_profile_id: profile.id,
    })

    // Auditoria (acção do utilizador) — actor/tenant do JWT, sem tokens
    await supabase.rpc('record_audit_log', {
      p_action: 'whatsapp.send', p_table_name: 'whatsapp_messages',
      p_record_id: res.message_id, p_metadata: { conversation_id: conversationId },
    })

    return NextResponse.json({ ok: true, message_id: res.message_id }, { status: 201 })
  } catch (e) {
    if (e instanceof OutboundError) {
      // 409 para janela/canal (estado), 502 para falha de envio
      const status = e.code === 'window' || e.code === 'no-channel' ? 409 : e.code === 'send-failed' ? 502 : 400
      return NextResponse.json({ error: e.message, code: e.code }, { status })
    }
    logger.error('Erro inesperado no envio WhatsApp', { erro: e instanceof Error ? e.message : String(e) })
    return NextResponse.json({ error: 'Erro ao enviar' }, { status: 500 })
  }
}
