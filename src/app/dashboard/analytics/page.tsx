'use client'
// /dashboard/analytics — painel de inteligência de negócio.
// KPIs, heatmap de horários, previsão de receita, top serviços por receita.
import React, { useMemo, useState } from 'react'
import { TrendingUp, Calendar, DollarSign, Activity, Award } from 'lucide-react'
import PageHeader    from '@/components/design-system/PageHeader/PageHeader'
import AccessDenied  from '@/components/design-system/AccessDenied/AccessDenied'
import LoadingState  from '@/components/design-system/LoadingState/LoadingState'
import ErrorState    from '@/components/design-system/ErrorState/ErrorState'
import { BarrasHorizontais, ColunasVerticais } from '@/components/design-system/Charts/Charts'
import { useBookings }    from '@/hooks/useBookings'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth }        from '@/providers/AuthProvider'
import { formatCurrencyByCode } from '@/lib/i18n/currency'
import {
  receitaPorDia, receitaPorServico, heatmapHorarios, previsaoReceita, taxaOcupacao,
} from '@/lib/analytics/series'
import type { TenantSettings } from '@/types/domain/tenant'
import type { SupportedLocale } from '@/types/domain'

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const JANELAS = [7, 30, 90] as const
type Janela = typeof JANELAS[number]

export default function AnalyticsPage() {
  const { can }  = usePermissions()
  const { tenant } = useAuth()
  const { data: bookings = [], isLoading, error } = useBookings()
  const [janela, setJanela] = useState<Janela>(30)

  if (!can('relatorios.view')) return <AccessDenied title="Analytics Restrito" description="Apenas gestores e proprietários têm acesso à análise de negócio." />
  if (isLoading) return <LoadingState message="A carregar dados de análise..." />
  if (error)     return <ErrorState title="Erro ao carregar" description="Não foi possível carregar os dados. Tente novamente." />

  const settings = tenant?.settings as TenantSettings | null | undefined
  const currency = settings?.currency ?? 'EUR'
  const locale   = (settings?.locale ?? 'pt-PT') as SupportedLocale
  const fmt      = (v: number) => formatCurrencyByCode(v, currency, locale)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <PageHeader title="Analytics" description="Inteligência de negócio em tempo real." />
        <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs bg-white">
          {JANELAS.map((j) => (
            <button
              key={j}
              onClick={() => setJanela(j)}
              className={`px-3 py-1.5 font-medium transition-colors ${janela === j ? 'bg-[color:var(--tenant-primary)] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {j === 7 ? '7 dias' : j === 30 ? '30 dias' : '90 dias'}
            </button>
          ))}
        </div>
      </div>

      <AnalyticsConteudo bookings={bookings} janela={janela} fmt={fmt} />
    </div>
  )
}

function AnalyticsConteudo({
  bookings, janela, fmt,
}: {
  bookings: Parameters<typeof receitaPorDia>[0]
  janela:   Janela
  fmt:      (v: number) => string
}) {
  const serieReceita = useMemo(() => receitaPorDia(bookings, janela), [bookings, janela])
  const topServicos  = useMemo(() => receitaPorServico(bookings, 6), [bookings])
  const heatmap      = useMemo(() => heatmapHorarios(bookings), [bookings])
  const previsao     = useMemo(() => previsaoReceita(bookings), [bookings])
  const ocupacao     = useMemo(() => taxaOcupacao(bookings, janela), [bookings, janela])

  const mesTotalMes    = bookings.filter((b) => {
    const d = new Date(b.start_at)
    const n = new Date()
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear() && b.status !== 'cancelled'
  }).length

  const maxHeat = Math.max(...heatmap.map((c) => c.count), 1)

  return (
    <>
      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<Calendar className="w-5 h-5" />}   label="Marcações este mês" value={String(mesTotalMes)} />
        <KpiCard icon={<DollarSign className="w-5 h-5" />} label="Receita confirmada"  value={fmt(previsao.confirmada)} />
        <KpiCard icon={<TrendingUp className="w-5 h-5" />} label="Previsão fim do mês" value={fmt(previsao.prevista)} highlight />
        <KpiCard icon={<Activity className="w-5 h-5" />}   label={`Ocupação (${janela}d)`}  value={`${ocupacao}%`} />
      </div>

      {/* ── Receita por dia ── */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm p-5">
        <p className="text-sm font-semibold text-slate-800 mb-4">Receita por dia — últimos {janela} dias</p>
        <ColunasVerticais dados={serieReceita} formatar={fmt} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Top serviços por receita ── */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm p-5">
          <p className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            Top serviços por receita
          </p>
          <BarrasHorizontais dados={topServicos} formatar={fmt} />
          {topServicos.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">Sem marcações confirmadas ainda.</p>
          )}
        </div>

        {/* ── Heatmap de horários ── */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm p-5">
          <p className="text-sm font-semibold text-slate-800 mb-4">Heatmap de horários</p>
          <Heatmap cells={heatmap} maxCount={maxHeat} />
        </div>
      </div>
    </>
  )
}

// ── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, highlight = false }: {
  icon: React.ReactNode; label: string; value: string; highlight?: boolean
}) {
  return (
    <div className={`rounded-xl border shadow-sm p-4 ${highlight ? 'bg-[color:var(--tenant-primary)]/5 border-[color:var(--tenant-primary)]/20' : 'bg-white/70 backdrop-blur-sm border-white/60'}`}>
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg mb-3 ${highlight ? 'bg-[color:var(--tenant-primary)]/10' : 'bg-slate-100'}`}>
        <span className={highlight ? 'text-[color:var(--tenant-primary)]' : 'text-slate-500'}>{icon}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}

// ── Heatmap visual ────────────────────────────────────────────────────────────

function Heatmap({ cells, maxCount }: { cells: ReturnType<typeof heatmapHorarios>; maxCount: number }) {
  const horas = Array.from(new Set(cells.map((c) => c.hour))).sort((a, b) => a - b)

  if (cells.every((c) => c.count === 0)) {
    return <p className="text-sm text-slate-400 text-center py-6">Sem dados de horários ainda.</p>
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[320px]">
        {/* Cabeçalho — horas */}
        <div className="flex gap-px mb-1 ml-8">
          {horas.map((h) => (
            <div key={h} className="flex-1 text-center text-[9px] text-slate-400 font-medium">
              {h}h
            </div>
          ))}
        </div>
        {/* Linhas — dias da semana */}
        {DIAS_SEMANA.map((dia, dow) => (
          <div key={dia} className="flex items-center gap-px mb-px">
            <span className="w-8 text-[10px] text-slate-400 font-medium flex-shrink-0">{dia}</span>
            {horas.map((hour) => {
              const cell = cells.find((c) => c.dayOfWeek === dow && c.hour === hour)
              const count = cell?.count ?? 0
              const intensity = maxCount > 0 ? count / maxCount : 0
              return (
                <div
                  key={hour}
                  className="flex-1 aspect-square rounded-sm"
                  style={{
                    backgroundColor: intensity === 0
                      ? '#f1f5f9'
                      : `color-mix(in srgb, var(--tenant-primary) ${Math.round(intensity * 85 + 15)}%, white)`,
                  }}
                  title={`${dia} ${hour}h: ${count} marcação(ões)`}
                />
              )
            })}
          </div>
        ))}
        {/* Legenda */}
        <div className="flex items-center justify-end gap-2 mt-2">
          <span className="text-[9px] text-slate-400">Menos</span>
          {[0, 0.2, 0.4, 0.7, 1].map((v) => (
            <div
              key={v}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: v === 0 ? '#f1f5f9' : `color-mix(in srgb, var(--tenant-primary) ${Math.round(v * 85 + 15)}%, white)` }}
            />
          ))}
          <span className="text-[9px] text-slate-400">Mais</span>
        </div>
      </div>
    </div>
  )
}
