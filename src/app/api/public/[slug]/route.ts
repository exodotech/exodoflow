// GET /api/public/[slug] — info do tenant + serviços para o portal público.
// Público (sem auth). Só responde se o tenant existe, está ativo e tem o
// booking_portal ligado. Nenhum dado sensível é exposto.
import { NextResponse } from 'next/server'
import { getPortalTenant, getPortalServicos } from '@/services/public-booking'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tenant = await getPortalTenant(slug)
  if (!tenant) {
    return NextResponse.json({ error: 'Portal indisponível.' }, { status: 404 })
  }
  const services = await getPortalServicos(tenant.id)
  return NextResponse.json({ tenant, services })
}
