// POST /api/public/[slug]/book — cria uma marcação pública (visitante + booking
// 'pending'). Público mas com rate-limit por IP (anti-spam). Revalida o slot.
import { NextResponse } from 'next/server'
import { getPortalTenant, criarMarcacaoPublica } from '@/services/public-booking'
import { marcacaoPublicaSchema } from '@/lib/validators/public-booking'
import { clientKeyFromRequest } from '@/lib/rate-limit'
import { checkRateLimitDb } from '@/lib/rate-limit-db'
import { logger } from '@/lib/logger'

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // Anti-spam: limite por IP (portal é público). Store distribuído (partilhado
  // entre instâncias serverless), com fallback in-memory se a BD falhar.
  const rl = await checkRateLimitDb(`public-book:${clientKeyFromRequest(req)}`, { limit: 8, windowMs: 60_000 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Demasiados pedidos. Tente novamente daqui a pouco.' }, { status: 429, headers: rl.headers })
  }

  const tenant = await getPortalTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Portal indisponível.' }, { status: 404 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 }) }

  const parsed = marcacaoPublicaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 })
  }
  const d = parsed.data

  try {
    await criarMarcacaoPublica({
      tenantId: tenant.id, serviceId: d.service_id, resource_id: d.resource_id,
      start_at: d.start_at, end_at: d.end_at, name: d.name, phone: d.phone || undefined,
    })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao criar marcação.'
    logger.warn('Falha na marcação pública', { slug, erro: msg })
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
