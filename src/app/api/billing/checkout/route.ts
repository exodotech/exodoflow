// POST /api/billing/checkout — SUPERADMIN ONLY.
// Owners NÃO podem mudar o próprio plano — apenas o superadmin pode atribuir
// planos a tenants via /admin/empresas/[id]. Esta rota é mantida para
// compatibilidade futura com Stripe webhooks e fluxos de activação.
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

  // Apenas o superadmin pode acionar checkout. Owners e managers não.
  if (profile?.role !== 'superadmin') {
    return NextResponse.json(
      { error: 'Alterações de plano são feitas pelo suporte. Contacte suporte@exodoflow.pt.' },
      { status: 403 },
    )
  }

  let payload: { planSlug?: string; cycle?: string; tenantId?: string }
  try { payload = await request.json() } catch { return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 }) }

  const planSlug = (payload.planSlug ?? '').trim()
  const targetTenantId = (payload.tenantId ?? '').trim()
  const cycle: BillingCycle = payload.cycle === 'yearly' ? 'yearly' : 'monthly'
  if (!planSlug || !targetTenantId) {
    return NextResponse.json({ error: 'planSlug e tenantId são obrigatórios.' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin

  try {
    const r = await iniciarCheckout({ tenantId: targetTenantId, planSlug, cycle, appUrl })
    await supabase.rpc('record_audit_log', {
      p_action:     'billing.checkout.superadmin',
      p_table_name: 'tenants',
      p_record_id:  targetTenantId,
      p_metadata:   { plan: planSlug, cycle, mock: r.mock, by: user.id } as never,
    })
    return NextResponse.json({ ok: true, url: r.url, mock: r.mock }, { status: 200 })
  } catch (e) {
    logger.error('Erro no checkout de billing', { erro: e instanceof Error ? e.message : String(e) })
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro no checkout.' }, { status: 500 })
  }
}
