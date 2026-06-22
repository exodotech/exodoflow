// Webhook do WhatsApp Cloud API — FASE 1A (apenas INBOUND).
// GET  → handshake de verificação da Meta (hub.challenge).
// POST → recebe mensagens/estados, valida a assinatura HMAC e grava (server-side).
//
// NÃO envia mensagens, NÃO chama IA, NÃO usa access_token nesta fase.
// Segredos (WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET) vivem só no servidor.
import { NextResponse } from 'next/server'
import { verifyMetaSignature } from '@/lib/whatsapp/signature'
import { processWebhookPayload } from '@/lib/whatsapp/inbound'
import { checkRateLimit, clientKeyFromRequest } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import type { WhatsAppWebhookPayload } from '@/types/domain/whatsapp'

export const dynamic = 'force-dynamic'

// ── GET: verificação do webhook (Meta) ───────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN

  if (mode === 'subscribe' && verifyToken && token === verifyToken && challenge) {
    // Responder o challenge em texto puro (requisito da Meta)
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }

  logger.security('Webhook WhatsApp: verificação falhou', { action: 'whatsapp.verify' })
  return new NextResponse('Forbidden', { status: 403 })
}

// ── POST: mensagens/estados ───────────────────────────────────────────────────
export async function POST(request: Request) {
  // Rate-limit básico (o webhook é o único ponto de entrada externo)
  const rl = checkRateLimit(`wa-webhook:${clientKeyFromRequest(request)}`, { limit: 120, windowMs: 60_000 })
  if (!rl.allowed) return new NextResponse('Too Many Requests', { status: 429, headers: rl.headers })

  // Corpo CRU — necessário para o HMAC (re-serializar invalidaria a assinatura)
  const rawBody = await request.text()

  // ── Validação de assinatura ────────────────────────────────────────────────
  const appSecret   = process.env.WHATSAPP_APP_SECRET
  const isProd      = process.env.NODE_ENV === 'production'
  const allowUnsigned = process.env.WHATSAPP_WEBHOOK_ALLOW_UNSIGNED_DEV === 'true' && !isProd
  const sig = verifyMetaSignature(rawBody, request.headers.get('x-hub-signature-256'), appSecret)

  if (!sig.ok) {
    // Em DEV, com a flag explícita, permitimos sem assinatura (para testes locais).
    // Em produção, NUNCA — bloqueia.
    if (allowUnsigned && (sig.reason === 'no-secret' || sig.reason === 'no-signature')) {
      logger.warn('Webhook WhatsApp aceite SEM assinatura (modo dev)', { action: 'whatsapp.inbound.dev' })
    } else {
      logger.security('Webhook WhatsApp: assinatura inválida — bloqueado', { action: 'whatsapp.inbound', motivo: sig.reason })
      return new NextResponse('Unauthorized', { status: 401 })
    }
  }

  // ── Processar payload ──────────────────────────────────────────────────────
  let payload: WhatsAppWebhookPayload
  try {
    payload = JSON.parse(rawBody) as WhatsAppWebhookPayload
  } catch {
    // Corpo inválido — 200 para a Meta não repetir indefinidamente; nada é gravado.
    return NextResponse.json({ ok: true, ignored: 'invalid-json' }, { status: 200 })
  }

  if (payload?.object !== 'whatsapp_business_account') {
    return NextResponse.json({ ok: true, ignored: 'not-wa' }, { status: 200 })
  }

  try {
    const result = await processWebhookPayload(payload)
    logger.info('Webhook WhatsApp processado', {
      action: 'whatsapp.inbound',
      matched: result.matched, inserted: result.inserted, duplicates: result.duplicates, statuses: result.statuses,
    })
  } catch (e) {
    // Nunca devolver 5xx por erro de processamento — evita retries em loop da Meta.
    logger.error('Erro ao processar webhook WhatsApp', { erro: e instanceof Error ? e.message : String(e) })
  }

  // Responder 200 sempre que a assinatura passou (mesmo sem canal/duplicado).
  return NextResponse.json({ ok: true }, { status: 200 })
}
