'use client'
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, Mail } from 'lucide-react'
import SectionHeader from '@/components/design-system/SectionHeader/SectionHeader'
import { Button }    from '@/components/design-system/Button/Button'
import Badge         from '@/components/design-system/Badge/Badge'
import AccessDenied  from '@/components/design-system/AccessDenied/AccessDenied'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth }        from '@/providers/AuthProvider'
import { listarPlanos, type Plan } from '@/services/planos'
import { SUBSCRIPTION_STATUS_LABELS, precoDoCicloMoeda, type SubscriptionStatus } from '@/lib/billing/plan'
import { formatCurrencyByCode } from '@/lib/i18n/currency'
import type { SupportedLocale } from '@/types/domain'

const STATUS_VARIANT: Record<SubscriptionStatus, 'success' | 'warning' | 'error' | 'default'> = {
  active: 'success', trialing: 'warning', past_due: 'error', canceled: 'error', none: 'default',
}

export function PainelPlano({ locale }: { locale: SupportedLocale }) {
  const { isManagerOrAbove } = usePermissions()
  const { tenant } = useAuth()

  const { data: planos = [] } = useQuery({ queryKey: ['planos'], queryFn: listarPlanos, enabled: isManagerOrAbove })

  if (!isManagerOrAbove) {
    return <AccessDenied title="Área de Billing Restrita" description="Apenas o proprietário e gestores podem ver o plano e a faturação." />
  }

  const t = tenant as unknown as { plan_id?: string | null; subscription_status?: SubscriptionStatus; current_period_end?: string | null; settings?: { currency?: string } }
  const status   = t?.subscription_status ?? 'trialing'
  const currency = t?.settings?.currency ?? 'EUR'
  const planoAtual = planos.find((p) => p.id === t?.plan_id) ?? null
  const fmt = (v: number | null) => v == null ? 'Grátis' : formatCurrencyByCode(v, currency, locale)

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

      {/* Planos disponíveis — só informativo */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm p-6">
        <SectionHeader title="Planos disponíveis" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
          {planos.map((p: Plan) => {
            const atual = p.id === t?.plan_id && status === 'active'
            const preco = precoDoCicloMoeda(p, 'monthly', currency)
            return (
              <div
                key={p.id}
                className={`rounded-xl border p-4 flex flex-col ${atual ? 'border-[color:var(--tenant-primary)] ring-1 ring-[color:var(--tenant-primary)]' : 'border-slate-200'}`}
              >
                <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {fmt(preco)}
                  <span className="text-xs font-normal text-gray-400">{preco != null ? '/mês' : ''}</span>
                </p>
                <ul className="mt-3 space-y-1 text-xs text-gray-600 flex-1">
                  {p.max_clients != null && <li>Até {p.max_clients} clientes</li>}
                  {p.max_resources != null && <li>Até {p.max_resources} recursos</li>}
                  {p.max_bookings_month != null && <li>{p.max_bookings_month} marcações/mês</li>}
                  {p.max_clients == null && <li>Clientes ilimitados</li>}
                </ul>
                {atual && (
                  <div className="mt-4">
                    <Button size="sm" variant="outline" disabled className="w-full gap-1">
                      <Check className="w-4 h-4" /> Plano atual
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Aviso — alterações de plano via suporte */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <Mail className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-900">Quer mudar de plano?</p>
          <p className="text-sm text-blue-700 mt-0.5">
            As alterações de plano são feitas pela equipa ExodoFlow. Envie-nos um e-mail e tratamos de tudo.
          </p>
          <a
            href="mailto:suporte@exodoflow.pt?subject=Alteração de plano"
            className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-white px-4 py-2 rounded-lg"
            style={{ backgroundImage: 'var(--brand-cta-gradient)' }}
          >
            <Mail className="w-4 h-4" />
            Contactar suporte
          </a>
        </div>
      </div>
    </div>
  )
}
