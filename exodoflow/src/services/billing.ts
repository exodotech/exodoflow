// Serviço de Billing — SERVER-SIDE apenas (usa service_role).
// Funciona em modo SIMULADO (BILLING_MOCK, por omissão) ativando o plano
// diretamente, ou com Stripe real (via fetch + verificação de assinatura por
// crypto — sem SDK). Os campos de subscrição do tenant só são escritos aqui
// (trigger fn_guard_tenant_billing impede escrita pelo cliente).
import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { precoDoCiclo, fimDoPeriodo, type BillingCycle } from '@/lib/billing/plan'
import { logger } from '@/lib/logger'

export function billingMock(): boolean {
  // Real só quando explicitamente desligado E com chave Stripe configurada.
  return process.env.BILLING_MOCK !== 'false' || !process.env.STRIPE_SECRET_KEY
}

export interface CheckoutResult { url: string; mock: boolean }

// Inicia o checkout de um plano para um tenant. Em modo simulado, ativa já o
// plano e devolve a página de sucesso. Em modo real, cria a sessão Stripe.
export async function iniciarCheckout(opts: {
  tenantId: string
  planSlug: string
  cycle: BillingCycle
  appUrl: string
}): Promise<CheckoutResult> {
  const admin = createAdminClient()

  const { data: plan, error } = await admin
    .from('plans').select('*').eq('slug', opts.planSlug).eq('is_active', true).single()
  if (error || !plan) throw new Error('Plano não encontrado.')

  if (billingMock()) {
    // SIMULADO: ativa o plano como se o pagamento tivesse sido concluído.
    const fim = fimDoPeriodo(opts.cycle)
    const { error: upErr } = await admin.from('tenants').update({
      plan_id:             plan.id,
      subscription_status: 'active',
      billing_cycle:       opts.cycle,
      current_period_end:  fim.toISOString(),
      plan_started_at:     new Date().toISOString(),
    }).eq('id', opts.tenantId)
    if (upErr) throw new Error(`Erro ao ativar plano (simulado): ${upErr.message}`)
    logger.info('Billing simulado: plano ativado', { tenant: opts.tenantId, plan: plan.slug })
    return { url: `${opts.appUrl}/dashboard/configuracoes?billing=sucesso&simulado=1`, mock: true }
  }

  // REAL: cria uma Checkout Session no Stripe (subscription).
  const features = (plan.features ?? {}) as Record<string, unknown>
  const priceId = opts.cycle === 'yearly'
    ? (features.stripe_price_yearly as string | undefined)
    : (features.stripe_price_monthly as string | undefined)
  if (!priceId) {
    throw new Error(`Plano "${plan.slug}" sem Price ID do Stripe para ciclo ${opts.cycle}. Configure plans.features.stripe_price_${opts.cycle}.`)
  }
  const preco = precoDoCiclo(plan, opts.cycle)

  const body = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    client_reference_id: opts.tenantId,
    success_url: `${opts.appUrl}/dashboard/configuracoes?billing=sucesso`,
    cancel_url:  `${opts.appUrl}/dashboard/configuracoes?billing=cancelado`,
  })
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Stripe checkout falhou (${res.status}): ${txt.slice(0, 200)}`)
  }
  const session = (await res.json()) as { url?: string }
  if (!session.url) throw new Error('Stripe não devolveu URL de checkout.')
  logger.info('Billing real: checkout criado', { tenant: opts.tenantId, plan: plan.slug, preco })
  return { url: session.url, mock: false }
}

// Verifica a assinatura de um webhook do Stripe (HMAC-SHA256), sem SDK.
// Formato do header: "t=<timestamp>,v1=<assinatura>".
export function verificarAssinaturaStripe(payload: string, header: string | null, secret: string): boolean {
  if (!header) return false
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=')) as [string, string][])
  const t = parts['t']; const v1 = parts['v1']
  if (!t || !v1) return false
  const esperado = createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(esperado), Buffer.from(v1))
  } catch {
    return false
  }
}

// Processa um evento do Stripe e atualiza a subscrição do tenant.
export async function processarEventoStripe(evt: {
  type: string
  data: { object: Record<string, unknown> }
}): Promise<void> {
  const admin = createAdminClient()
  const obj = evt.data.object

  if (evt.type === 'checkout.session.completed') {
    const tenantId = obj.client_reference_id as string | undefined
    if (!tenantId) return
    await admin.from('tenants').update({
      subscription_status:    'active',
      stripe_customer_id:     (obj.customer as string) ?? null,
      stripe_subscription_id: (obj.subscription as string) ?? null,
      plan_started_at:        new Date().toISOString(),
    }).eq('id', tenantId)
    logger.info('Stripe: subscrição ativada', { tenant: tenantId })
    return
  }

  if (evt.type === 'customer.subscription.updated' || evt.type === 'customer.subscription.deleted') {
    const subId = obj.id as string
    const statusStripe = obj.status as string
    const cancelada = evt.type === 'customer.subscription.deleted' || statusStripe === 'canceled'
    const periodEnd = obj.current_period_end as number | undefined
    await admin.from('tenants').update({
      subscription_status: cancelada ? 'canceled' : (statusStripe === 'past_due' ? 'past_due' : 'active'),
      current_period_end:  periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    }).eq('stripe_subscription_id', subId)
    logger.info('Stripe: subscrição atualizada', { sub: subId, status: statusStripe })
  }
}
