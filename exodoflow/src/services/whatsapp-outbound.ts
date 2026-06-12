// Envio MANUAL (humano) de WhatsApp — SERVER-SIDE apenas. Fase 1B.
// NÃO há IA, NÃO há templates, NÃO há automações. Só resposta humana dentro da
// janela de 24h da Meta.
//
// SEGURANÇA:
// - o access_token vive em communication_channels.config e NUNCA chega ao browser;
// - este módulo só corre no servidor (usa a service_role via createAdminClient);
// - o tenant_id vem sempre da sessão (a route valida-o), nunca do browser.
//
// MOCK: com WHATSAPP_OUTBOUND_MOCK=true não chama a Meta — devolve uma resposta
// fake no formato Meta e grava tudo na mesma. Em produção exige a flag + aviso.
import crypto from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import type { Json } from '@/types/database'

const META_GRAPH_VERSION = 'v21.0'
const JANELA_24H_MS = 24 * 60 * 60 * 1000
const MAX_LEN = 4096

export class OutboundError extends Error {
  constructor(message: string, readonly code: 'no-channel' | 'no-conversation' | 'window' | 'send-failed' | 'invalid') {
    super(message)
  }
}

export interface EnviarManualInput {
  tenant_id:         string
  conversation_id:   string
  content:           string
  actor_profile_id?: string | null
}

interface MetaSendResponse {
  messages?: Array<{ id: string }>
  error?:    { message?: string }
}

// Chama a Meta Graph API (ou devolve mock). Lança em falha real.
async function callMeta(phoneNumberId: string, accessToken: string, to: string, content: string): Promise<{ id: string; raw: Json }> {
  const useMock = process.env.WHATSAPP_OUTBOUND_MOCK === 'true'

  if (useMock) {
    if (process.env.NODE_ENV === 'production') {
      logger.security('WhatsApp outbound em MOCK em produção (flag explícita)', { action: 'whatsapp.outbound.mock' })
    }
    // Gatilho de teste para o caminho de FALHA (documentado): conteúdo === 'MOCK_FAIL'
    if (content.trim() === 'MOCK_FAIL') {
      throw new OutboundError('Falha simulada (mock)', 'send-failed')
    }
    const id = `wamid.MOCK_${crypto.randomUUID()}`
    return { id, raw: { mock: true, messages: [{ id }] } as unknown as Json }
  }

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${phoneNumberId}/messages`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: content } }),
  })
  const data = (await res.json().catch(() => ({}))) as MetaSendResponse
  if (!res.ok || !data.messages?.[0]?.id) {
    throw new OutboundError(data.error?.message ?? `Envio falhou (HTTP ${res.status})`, 'send-failed')
  }
  return { id: data.messages[0].id, raw: data as unknown as Json }
}

export async function enviarMensagemWhatsAppManual(input: EnviarManualInput): Promise<{ message_id: string; wa_message_id: string }> {
  const content = (input.content ?? '').trim()
  if (!content) throw new OutboundError('Mensagem vazia', 'invalid')
  if (content.length > MAX_LEN) throw new OutboundError(`Máximo ${MAX_LEN} caracteres`, 'invalid')

  const admin = createAdminClient()

  // 1. Conversa do tenant (recipient + client)
  const { data: conv } = await admin
    .from('whatsapp_conversations')
    .select('id, wa_phone_number, client_id, status')
    .eq('id', input.conversation_id)
    .eq('tenant_id', input.tenant_id)
    .maybeSingle()
  if (!conv) throw new OutboundError('Conversa não encontrada', 'no-conversation')

  // 2. Canal WhatsApp ACTIVO (access_token + phone_number_id no servidor)
  const { data: channel } = await admin
    .from('communication_channels')
    .select('config')
    .eq('tenant_id', input.tenant_id)
    .eq('channel', 'whatsapp')
    .eq('is_active', true)
    .maybeSingle()
  const cfg = (channel?.config ?? {}) as { access_token?: string; phone_number_id?: string }
  if (!channel || !cfg.phone_number_id || !cfg.access_token) {
    throw new OutboundError('Canal WhatsApp não configurado ou inactivo', 'no-channel')
  }

  // 3. Janela de 24h — desde a última mensagem INBOUND do cliente
  const { data: lastIn } = await admin
    .from('whatsapp_messages')
    .select('created_at')
    .eq('conversation_id', conv.id)
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const lastInboundMs = lastIn?.created_at ? new Date(lastIn.created_at).getTime() : 0
  if (!lastInboundMs || Date.now() - lastInboundMs > JANELA_24H_MS) {
    throw new OutboundError('Fora da janela de 24h. Use template aprovado na próxima fase.', 'window')
  }

  // 4. Enviar (Meta real ou mock). Em falha → log FAILED + lança.
  let sent: { id: string; raw: Json }
  try {
    sent = await callMeta(cfg.phone_number_id, cfg.access_token, conv.wa_phone_number, content)
  } catch (e) {
    await admin.from('communication_logs').insert({
      tenant_id:  input.tenant_id,
      client_id:  conv.client_id,
      channel:    'whatsapp',
      event_type: 'manual_reply',
      recipient:  conv.wa_phone_number,
      body:       content,
      status:     'failed',
      error:      e instanceof Error ? e.message : 'erro desconhecido',
    })
    throw e instanceof OutboundError ? e : new OutboundError('Envio falhou', 'send-failed')
  }

  // 5. Gravar mensagem outbound
  const isMock = process.env.WHATSAPP_OUTBOUND_MOCK === 'true'
  const { data: msg, error: msgErr } = await admin
    .from('whatsapp_messages')
    .insert({
      tenant_id:        input.tenant_id,
      conversation_id:  conv.id,
      wa_message_id:    sent.id,
      direction:        'outbound',
      message_type:     'text',
      content,
      payload:          sent.raw,
      sent_by:          input.actor_profile_id ?? null,
      is_ai_generated:  false,            // resposta HUMANA
      processed_status: 'sent',
    })
    .select('id')
    .single()
  if (msgErr) throw new OutboundError(`Mensagem enviada mas falhou a gravação: ${msgErr.message}`, 'send-failed')

  // 6. Actualizar a conversa + log de comunicação
  await admin.from('whatsapp_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conv.id)
  await admin.from('communication_logs').insert({
    tenant_id:  input.tenant_id,
    client_id:  conv.client_id,
    channel:    'whatsapp',
    event_type: 'manual_reply',
    recipient:  conv.wa_phone_number,
    body:       content,
    status:     isMock ? 'simulated' : 'sent',
    sent_at:    new Date().toISOString(),
  })

  logger.info('WhatsApp outbound enviado', { action: 'whatsapp.outbound', mock: isMock, conversation_id: conv.id })
  return { message_id: msg.id, wa_message_id: sent.id }
}
