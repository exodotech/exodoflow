// GET /api/public/[slug]/slots?service_id=&date= — slots disponíveis (portal).
import { NextResponse } from 'next/server'
import { getPortalTenant, getPortalSlots } from '@/services/public-booking'

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { searchParams } = new URL(req.url)
  const serviceId = searchParams.get('service_id')
  const date      = searchParams.get('date')
  if (!serviceId || !date) {
    return NextResponse.json({ error: 'Parâmetros em falta.' }, { status: 400 })
  }

  const tenant = await getPortalTenant(slug)
  if (!tenant) return NextResponse.json({ error: 'Portal indisponível.' }, { status: 404 })

  try {
    const slots = await getPortalSlots(tenant.id, serviceId, date)
    return NextResponse.json({ slots })
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar horários.' }, { status: 500 })
  }
}
