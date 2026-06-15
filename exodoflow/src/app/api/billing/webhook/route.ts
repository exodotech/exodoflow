// POST /api/billing/webhook — recebe eventos do Stripe (modo real).
// Verifica a assinatura (HMAC) antes de processar. Em modo simulado não é usado.
// Lê o corpo CRU (necessário para validar a assinatura).
import { NextResponse } from 'next/server'
import { verificarAssinaturaStripe, processarEventoStripe } from '@/services/billing'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook não configurado.' }, { status: 503 })
  }

  const raw = await request.text()
  const sig = request.headers.get('stripe-signature')
  if (!verificarAssinaturaStripe(raw, sig, secret)) {
    return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 400 })
  }

  let evt: { type: string; data: { object: Record<string, unknown> } }
  try { evt = JSON.parse(raw) } catch { return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 }) }

  try {
    await processarEventoStripe(evt)
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (e) {
    logger.error('Erro a processar webhook Stripe', { tipo: evt.type, erro: e instanceof Error ? e.message : String(e) })
    return NextResponse.json({ error: 'Erro ao processar evento.' }, { status: 500 })
  }
}
