// POST /api/public/[slug]/waitlist — entra na lista de espera (portal público).
// Público mas com rate-limit por IP. Não requer auth.
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPortalTenant }   from '@/services/public-booking'
import { clientKeyFromRequest } from '@/lib/rate-limit'
import { checkRateLimitDb }     from '@/lib/rate-limit-db'
import { z } from 'zod'

const schema = z.object({
  contact_name:   z.string().min(2).max(120).trim(),
  contact_phone:  z.string().max(30).trim().optional(),
  service_id:     z.string().uuid().optional(),
  preferred_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes:          z.string().max(500).trim().optional(),
})

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const rl = await checkRateLimitDb(`waitlist:${clientKeyFromRequest(req)}`, { limit: 5, windowMs: 60_000 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Demasiados pedidos. Tente novamente em breve.' }, { status: 429, headers: rl.headers })
  }

  const tenant = await getPortalTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Portal indisponível.' }, { status: 404 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 }) }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 })
  }
  const d = parsed.data

  const admin = createAdminClient()
  const { error } = await admin.from('waitlist').insert({
    tenant_id:      tenant.id,
    contact_name:   d.contact_name,
    contact_phone:  d.contact_phone ?? null,
    service_id:     d.service_id ?? null,
    preferred_from: d.preferred_from ?? null,
    notes:          d.notes ?? null,
    status:         'waiting',
  })

  if (error) {
    return NextResponse.json({ error: 'Não foi possível guardar o pedido.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
