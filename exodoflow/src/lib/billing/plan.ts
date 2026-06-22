// Lógica pura de planos/subscrição (sem I/O — testável).
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'none'
export type BillingCycle = 'monthly' | 'yearly'

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trialing: 'Período experimental',
  active:   'Ativo',
  past_due: 'Pagamento em atraso',
  canceled: 'Cancelado',
  none:     'Sem subscrição',
}

// O tenant tem acesso pago/operacional? (trial e ativo dão acesso)
export function subscricaoDaAcesso(status: SubscriptionStatus): boolean {
  return status === 'trialing' || status === 'active'
}

// Um limite foi excedido? max=null/undefined => ilimitado (nunca excede).
export function limiteExcedido(atual: number, max: number | null | undefined): boolean {
  if (max == null) return false
  return atual >= max
}

// Pode adicionar mais um registo deste tipo dado o plano? (null = ilimitado)
export function podeAdicionar(atual: number, max: number | null | undefined): boolean {
  return !limiteExcedido(atual, max)
}

// Preço a cobrar conforme o ciclo (yearly cai para monthly se não houver anual).
export function precoDoCiclo(
  plan: { price_monthly: number | null; price_yearly: number | null },
  cycle: BillingCycle,
): number | null {
  if (cycle === 'yearly') return plan.price_yearly ?? plan.price_monthly
  return plan.price_monthly
}

// Preço conforme o ciclo E a moeda do tenant. Em BRL usa os preços próprios do
// Brasil (plans.features.price_brl_*); nas restantes moedas usa o preço base (€).
// Preços apresentados COM impostos incluídos.
export function precoDoCicloMoeda(
  plan: { price_monthly: number | null; price_yearly: number | null; features?: unknown },
  cycle: BillingCycle,
  currency: string,
): number | null {
  if (currency === 'BRL') {
    const f = (plan.features ?? {}) as Record<string, unknown>
    const m = typeof f.price_brl_monthly === 'number' ? f.price_brl_monthly : null
    const y = typeof f.price_brl_yearly === 'number'  ? f.price_brl_yearly  : null
    // Fallback ao preço base só se não houver preço BR definido (e não for grátis).
    if (m == null && y == null) return precoDoCiclo(plan, cycle)
    return cycle === 'yearly' ? (y ?? m) : m
  }
  return precoDoCiclo(plan, cycle)
}

// Data de fim do período conforme o ciclo (a partir de agora).
export function fimDoPeriodo(cycle: BillingCycle, from: Date = new Date()): Date {
  const d = new Date(from)
  if (cycle === 'yearly') d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  return d
}

// O plano é gratuito? (preço mensal 0 ou nulo)
export function planoEhGratuito(price_monthly: number | null | undefined): boolean {
  return (price_monthly ?? 0) <= 0
}

// A subscrição BLOQUEIA o acesso ao dashboard? Planos pagos com pagamento em
// atraso ou cancelados bloqueiam; planos GRATUITOS nunca bloqueiam (e estados
// 'none'/'trialing'/'active' dão acesso — grace durante a configuração).
export function subscricaoBloqueia(
  plan: { price_monthly: number | null },
  status: SubscriptionStatus,
): boolean {
  if (planoEhGratuito(plan.price_monthly)) return false
  return status === 'past_due' || status === 'canceled'
}
