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

// Data de fim do período conforme o ciclo (a partir de agora).
export function fimDoPeriodo(cycle: BillingCycle, from: Date = new Date()): Date {
  const d = new Date(from)
  if (cycle === 'yearly') d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  return d
}
