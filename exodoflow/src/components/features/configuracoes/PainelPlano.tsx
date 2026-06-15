'use client'
import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, Loader2 } from 'lucide-react'
import SectionHeader from '@/components/design-system/SectionHeader/SectionHeader'
import { Button }    from '@/components/design-system/Button/Button'
import Badge         from '@/components/design-system/Badge/Badge'
import AccessDenied  from '@/components/design-system/AccessDenied/AccessDenied'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth }        from '@/providers/AuthProvider'
import { listarPlanos, iniciarCheckout, type Plan } from '@/services/planos'
import { SUBSCRIPTION_STATUS_LABELS, precoDoCiclo, type SubscriptionStatus, type BillingCycle } from '@/lib/billing/plan'
import { formatCurrencyByCode } from '@/lib/i18n/currency'
import type { SupportedLocale } from '@/types/domain'

const STATUS_VARIANT: Record<SubscriptionStatus, 'success' | 'warning' | 'error' | 'default'> = {
  active: 'success', trialing: 'warning', past_due: 'error', canceled: 'error', none: 'default',
}

export function PainelPlano({ locale }: { locale: SupportedLocale }) {
  const { isManagerOrAbove, isOwner } = usePermissions()
  const { tenant } = useAuth()
  const [cycle, setCycle] = useState<BillingCycle>('monthly')
  const [aPagar, setAPagar] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const { data: planos = [] } = useQuery({ queryKey: ['planos'], queryFn: listarPlanos, enabled: isManagerOrAbove })

  if (!isManagerOrAbove) {
    return <AccessDenied title="Área de Billing Restrita" description="Apenas o proprietário e gestores podem ver o plano e a faturação." />
  }

  const t = tenant as unknown as { plan_id?: string | null; subscription_status?: SubscriptionStatus; current_period_end?: string | null; settings?: { currency?: string } }
  const status   = t?.subscription_status ?? 'trialing'
  const currency = t?.settings?.currency ?? 'EUR'
  const planoAtual = planos.find((p) => p.id === t?.plan_id) ?? null
  const fmt = (v: number | null) => v == null ? 'Grátis' : formatCurrencyByCode(v, currency, locale)

  async function ativar(plan: Plan) {
    setErro(null); setAPagar(plan.slug)
    try {
      const { url } = await iniciarCheckout(plan.slug, cycle)
      window.location.assign(url)   // sucesso (simulado) ou Stripe Checkout (real)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao iniciar a subscrição.')
      setAPagar(null)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Plano atual */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm p-6">
        <SectionHeader title="Plano atual" />
        <div className="mt-4 flex items-center justify-between gap-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
          <div>
            <p className="text-sm font-semibold text-gray-900">{planoAtual?.name ?? 'Período experimental'}</p>
            {t?.current_period_end && status === 'active' && (
              <p className="text-xs text-gray-500 mt-0.5">Renova em {new Date(t.current_period_end).toLocaleDateString(locale)}</p>
            )}
          </div>
          <Badge variant={STATUS_VARIANT[status]}>{SUBSCRIPTION_STATUS_LABELS[status]}</Badge>
        </div>
      </div>

      {/* Planos disponíveis */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <SectionHeader title="Planos" />
          <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs">
            <button onClick={() => setCycle('monthly')} className={`px-3 py-1.5 ${cycle === 'monthly' ? 'bg-[color:var(--tenant-primary)] text-white' : 'text-gray-600'}`}>Mensal</button>
            <button onClick={() => setCycle('yearly')} className={`px-3 py-1.5 ${cycle === 'yearly' ? 'bg-[color:var(--tenant-primary)] text-white' : 'text-gray-600'}`}>Anual</button>
          </div>
        </div>

        {erro && <p className="text-sm text-red-600 mt-3">{erro}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
          {planos.map((p) => {
            const atual = p.id === t?.plan_id && status === 'active'
            const preco = precoDoCiclo(p, cycle)
            return (
              <div key={p.id} className={`rounded-xl border p-4 flex flex-col ${atual ? 'border-[color:var(--tenant-primary)] ring-1 ring-[color:var(--tenant-primary)]' : 'border-slate-200'}`}>
                <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{fmt(preco)}<span className="text-xs font-normal text-gray-400">{preco != null ? (cycle === 'yearly' ? '/ano' : '/mês') : ''}</span></p>
                <ul className="mt-3 space-y-1 text-xs text-gray-600 flex-1">
                  {p.max_clients != null && <li>Até {p.max_clients} clientes</li>}
                  {p.max_resources != null && <li>Até {p.max_resources} recursos</li>}
                  {p.max_bookings_month != null && <li>{p.max_bookings_month} marcações/mês</li>}
                  {p.max_clients == null && <li>Clientes ilimitados</li>}
                </ul>
                <div className="mt-4">
                  {atual ? (
                    <Button size="sm" variant="outline" disabled className="w-full gap-1"><Check className="w-4 h-4" /> Plano atual</Button>
                  ) : (
                    <Button size="sm" disabled={!isOwner || aPagar !== null} onClick={() => ativar(p)} className="w-full gap-1">
                      {aPagar === p.slug ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {isOwner ? 'Escolher plano' : 'Só o proprietário'}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-[11px] text-gray-400 mt-4">
          Pagamento via Stripe. Em ambiente de demonstração, a subscrição é ativada em modo simulado.
        </p>
      </div>
    </div>
  )
}
