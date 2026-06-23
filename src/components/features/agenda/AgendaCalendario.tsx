'use client'
// Vista de calendário da Agenda — Dia e Semana, com navegação por data.
// Foco visual: ver rapidamente a ocupação. As acções por marcação são injectadas
// pelo pai via render-prop `acoes` (reutiliza a lógica existente).
import React, { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, Clock } from 'lucide-react'
import Badge from '@/components/design-system/Badge/Badge'
import {
  hojeKey, somarDias, diasDaSemana, nomeDiaCurto, diaDoMes,
  formatarDataLonga, agruparPorDia, horaNoFuso, inicioSemana,
} from '@/lib/agenda/calendario'
import { rotularClienteBooking } from '@/lib/agenda/cliente-label'
import type { BookingWithRelations, BookingStatus } from '@/types/domain'

type Variant = 'default' | 'primary' | 'success' | 'warning' | 'error'

interface Props {
  bookings:      BookingWithRelations[]
  timezone:      string
  statusLabels:  Record<BookingStatus, string>
  statusVariant: Record<BookingStatus, Variant>
  acoes?:        (b: BookingWithRelations) => React.ReactNode
}

export function AgendaCalendario({ bookings, timezone, statusLabels, statusVariant, acoes }: Props) {
  const [modo, setModo]   = useState<'dia' | 'semana'>('dia')
  const [dataKey, setDataKey] = useState<string>(() => hojeKey(timezone))
  const [aberto, setAberto]   = useState<string | null>(null)

  // Agrupa as marcações (não-canceladas) por dia, no fuso do tenant.
  const porDia = useMemo(
    () => agruparPorDia(bookings.filter((b) => b.status !== 'cancelled'), timezone),
    [bookings, timezone],
  )

  const passo = modo === 'dia' ? 1 : 7
  const navegar = (n: number) => { setDataKey((k) => somarDias(k, n * passo)); setAberto(null) }
  const irHoje  = () => { setDataKey(hojeKey(timezone)); setAberto(null) }

  const hoje = hojeKey(timezone)
  const semana = diasDaSemana(dataKey)

  const tituloPeriodo = modo === 'dia'
    ? formatarDataLonga(dataKey)
    : `${diaDoMes(inicioSemana(dataKey))}–${diaDoMes(semana[6])} ${formatarDataLonga(semana[6]).slice(3)}`

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm overflow-hidden">
      {/* Barra de navegação */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button onClick={() => navegar(-1)} aria-label="Anterior" className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={irHoje} className="px-3 h-8 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 border border-slate-200">
            Hoje
          </button>
          <button onClick={() => navegar(1)} aria-label="Seguinte" className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="ml-2 text-sm font-semibold text-slate-800 capitalize">{tituloPeriodo}</span>
        </div>
        {/* Toggle Dia/Semana */}
        <div className="flex gap-1 p-1 rounded-lg bg-slate-100">
          {(['dia', 'semana'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setModo(m); setAberto(null) }}
              className={`px-3 py-1 rounded-md text-sm font-medium capitalize transition-colors ${modo === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      {modo === 'dia' ? (
        <VistaDia
          ehHoje={dataKey === hoje} itens={porDia.get(dataKey) ?? []}
          timezone={timezone} statusLabels={statusLabels} statusVariant={statusVariant}
          aberto={aberto} setAberto={setAberto} acoes={acoes}
        />
      ) : (
        <VistaSemana
          dias={semana} hoje={hoje} porDia={porDia} timezone={timezone}
          onAbrirDia={(k) => { setDataKey(k); setModo('dia') }}
        />
      )}
    </div>
  )
}

// ── Vista de Dia ─────────────────────────────────────────────────────────────
function VistaDia({
  ehHoje, itens, timezone, statusLabels, statusVariant, aberto, setAberto, acoes,
}: {
  ehHoje: boolean; itens: BookingWithRelations[]; timezone: string
  statusLabels: Record<BookingStatus, string>; statusVariant: Record<BookingStatus, Variant>
  aberto: string | null; setAberto: (id: string | null) => void
  acoes?: (b: BookingWithRelations) => React.ReactNode
}) {
  if (itens.length === 0) {
    return (
      <div className="py-16 text-center">
        <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">{ehHoje ? 'Sem marcações para hoje — crie uma nova marcação.' : 'Sem marcações neste dia.'}</p>
      </div>
    )
  }
  return (
    <div className="divide-y divide-slate-100">
      {itens.map((b) => {
        const cor = b.service?.color ?? 'var(--tenant-primary)'
        const expandido = aberto === b.id
        return (
          <div key={b.id}>
            <button
              onClick={() => setAberto(expandido ? null : b.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60 text-left transition-colors"
            >
              {/* Hora */}
              <div className="flex-shrink-0 w-14 text-sm font-semibold text-slate-700 tabular-nums">
                {horaNoFuso(b.start_at, timezone)}
              </div>
              {/* Barra de cor do serviço */}
              <span className="flex-shrink-0 w-1 h-9 rounded-full" style={{ backgroundColor: cor }} />
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{b.service?.name ?? 'Serviço'}</p>
                <p className="text-xs text-slate-500 truncate">
                  {(() => { const r = rotularClienteBooking(b.client); return r.badge ? `${r.nome} · ${r.badge}` : r.nome })()}{b.resources?.[0]?.name ? ` · ${b.resources[0].name}` : ''}
                </p>
              </div>
              <Badge variant={statusVariant[b.status]}>{statusLabels[b.status]}</Badge>
            </button>
            {/* Acções (injectadas pelo pai) */}
            {expandido && acoes && (
              <div className="px-4 pb-3 pl-[4.5rem]">{acoes(b)}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Vista de Semana ──────────────────────────────────────────────────────────
function VistaSemana({
  dias, hoje, porDia, timezone, onAbrirDia,
}: {
  dias: string[]; hoje: string; porDia: Map<string, BookingWithRelations[]>
  timezone: string
  onAbrirDia: (k: string) => void
}) {
  return (
    <div className="grid grid-cols-7 min-w-[640px] sm:min-w-0 overflow-x-auto">
      {dias.map((k) => {
        const itens = porDia.get(k) ?? []
        const ehHoje = k === hoje
        return (
          <div key={k} className="border-r border-slate-100 last:border-r-0 min-h-[180px]">
            <button
              onClick={() => onAbrirDia(k)}
              className={`w-full px-2 py-2 text-center border-b border-slate-100 hover:bg-slate-50 transition-colors ${ehHoje ? 'bg-[color:var(--tenant-primary)]/5' : ''}`}
            >
              <p className="text-xs text-slate-400">{nomeDiaCurto(k)}</p>
              <p className={`text-sm font-bold ${ehHoje ? 'text-[color:var(--tenant-primary)]' : 'text-slate-700'}`}>{diaDoMes(k)}</p>
            </button>
            <div className="p-1 space-y-1">
              {itens.slice(0, 6).map((b) => (
                <button
                  key={b.id}
                  onClick={() => onAbrirDia(k)}
                  className="w-full text-left rounded-md px-1.5 py-1 text-xs hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: `color-mix(in srgb, ${b.service?.color ?? 'var(--tenant-primary)'} 14%, white)` }}
                  title={`${b.service?.name ?? ''} · ${b.client?.full_name ?? ''}`}
                >
                  <span className="font-medium text-slate-700 tabular-nums">{horaNoFuso(b.start_at, timezone)}</span>
                  <span className="block truncate text-slate-500">{b.service?.name ?? 'Serviço'}</span>
                </button>
              ))}
              {itens.length > 6 && (
                <p className="text-[10px] text-slate-400 text-center">+{itens.length - 6}</p>
              )}
              {itens.length === 0 && (
                <p className="text-[10px] text-slate-300 text-center py-2"><Clock className="w-3 h-3 inline" /></p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default AgendaCalendario
