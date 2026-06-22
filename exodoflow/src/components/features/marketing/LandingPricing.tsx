'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { PLANS } from '@/lib/marketing/landing-data'

// Secção de preços com alternância mensal/anual. O preço anual do seed
// equivale a ~10 meses (2 meses grátis), mostrado como poupança.
type Cycle = 'monthly' | 'yearly'

export function LandingPricing() {
  const [cycle, setCycle] = useState<Cycle>('monthly')

  return (
    <section id="precos" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-[var(--brand)]">Preços</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Planos simples, sem surpresas
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Comece grátis e mude de plano quando precisar. Sem fidelização.
          </p>
        </div>

        {/* Toggle mensal/anual */}
        <div className="mt-8 flex items-center justify-center">
          <div
            role="group"
            aria-label="Ciclo de cobrança"
            className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-white p-1 shadow-[var(--shadow-xs)]"
          >
            <button
              type="button"
              onClick={() => setCycle('monthly')}
              aria-pressed={cycle === 'monthly'}
              className={[
                'px-4 py-2 text-sm font-semibold rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]',
                cycle === 'monthly' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900',
              ].join(' ')}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setCycle('yearly')}
              aria-pressed={cycle === 'yearly'}
              className={[
                'px-4 py-2 text-sm font-semibold rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]',
                cycle === 'yearly' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900',
              ].join(' ')}
            >
              Anual
              <span className="ml-1.5 text-xs font-bold text-emerald-600">−2 meses</span>
            </button>
          </div>
        </div>

        {/* Cartões de plano */}
        <div className="mt-12 grid gap-6 lg:grid-cols-3 items-start">
          {PLANS.map((plan) => {
            const price = cycle === 'yearly' ? plan.priceYearly : plan.priceMonthly
            const isFree = plan.priceMonthly === 0
            return (
              <div
                key={plan.name}
                className={[
                  'relative flex flex-col rounded-2xl p-6 sm:p-8 transition-transform',
                  plan.highlighted
                    ? 'bg-white border-2 border-[var(--brand)] shadow-[var(--shadow-xl)] lg:-translate-y-2'
                    : 'bg-white/80 backdrop-blur-sm border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]',
                ].join(' ')}
              >
                {plan.badge && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm"
                    style={{ backgroundImage: 'var(--brand-cta-gradient)' }}
                  >
                    {plan.badge}
                  </span>
                )}

                <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{plan.tagline}</p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight text-slate-900">
                    {isFree ? '€0' : `€${price}`}
                  </span>
                  {!isFree && (
                    <span className="text-sm font-medium text-slate-500">
                      {cycle === 'yearly' ? '/ano' : '/mês'}
                    </span>
                  )}
                </div>
                <p className="mt-1 h-5 text-xs text-slate-400">
                  {!isFree && cycle === 'yearly' && `equivale a €${Math.round(plan.priceYearly / 12)}/mês`}
                </p>

                <Link
                  href="/register"
                  className={[
                    'mt-6 inline-flex items-center justify-center h-12 px-5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--brand)]',
                    plan.highlighted
                      ? 'text-white shadow-[var(--shadow-md)] hover:opacity-90'
                      : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300',
                  ].join(' ')}
                  style={plan.highlighted ? { backgroundImage: 'var(--brand-cta-gradient)' } : undefined}
                >
                  {isFree ? 'Começar grátis' : 'Pedir acesso'}
                </Link>

                <ul className="mt-8 space-y-3" role="list">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-3 text-sm text-slate-600">
                      <Check className="mt-0.5 w-4 h-4 flex-shrink-0 text-emerald-600" aria-hidden="true" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          Acesso por convite durante a fase controlada — fale connosco para ativar a sua conta.
        </p>
      </div>
    </section>
  )
}

export default LandingPricing
