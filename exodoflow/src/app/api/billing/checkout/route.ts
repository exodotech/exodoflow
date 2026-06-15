// POST /api/billing/checkout — inicia a subscrição de um plano.
// Autenticado; só OWNER (quem gere a faturação). tenant_id vem SEMPRE da sessão.
// Em modo simulado ativa o plano e devolve a página de sucesso.
import { NextResponse }   from 'next/server'
import { createClient }   from '@/lib/supabase/server'
import { checkRateLimit, clientKeyFromRequest } from '@/lib/rate-limit'
import { iniciarCheckout } from '@/services/billing'
import { logger }         from '@/lib/logger'
import type { BillingCycle } from '@/lib/billing/plan'

export async function POST(request: Request) {
  const rl = checkRateLimit(`billing:${clientKeyFromRequest(request)}`, { limit: 10, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Demasiados pedidos.' }, { status: 429, headers: rl.headers })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role, tenant_id').eq('id', user.id).single()
  if (!profile?.tenant_id) return NextResponse.json({ error: 'Tenant não identificado.' }, { status: 400 })
  if (profile.role !== 'owner') {
    return NextResponse.json({ error: 'Apenas o proprietário pode gerir a subscrição.' }, { status: 403 })
  }

  let payload: { planSlug?: string; cycle?: string }
  try { payload = await request.json() } catch { return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 }) }

  const planSlug = (payload.planSlug ?? '').trim()
  const cycle: BillingCycle = payload.cycle === 'yearly' ? 'yearly' : 'monthly'
  if (!planSlug) return NextResponse.json({ error: 'Plano em falta.' }, { status: 400 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin

  try {
    const r = await iniciarCheckout({ tenantId: profile.tenant_id, planSlug, cycle, appUrl })
    await supabase.rpc('record_audit_log', {
      p_action:     'billing.checkout',
      p_table_name: 'tenants',
      p_record_id:  profile.tenant_id,
      p_metadata:   { plan: planSlug, cycle, mock: r.mock } as never,
    })
    return NextResponse.json({ ok: true, url: r.url, mock: r.mock }, { status: 200 })
  } catch (e) {
    logger.error('Erro no checkout de billing', { erro: e instanceof Error ? e.message : String(e) })
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro no checkout.' }, { status: 500 })
  }
}
