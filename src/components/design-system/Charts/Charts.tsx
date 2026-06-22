'use client'
// Gráficos simples sem dependências externas (divs + Tailwind). Mobile-first.
import React from 'react'
import type { PontoSerie } from '@/lib/analytics/series'

// ── Barras horizontais (ex: top serviços) ────────────────────────────────────
export function BarrasHorizontais({
  dados, formatar, corPadrao = 'var(--tenant-primary)',
}: {
  dados: PontoSerie[]
  formatar?: (v: number) => string
  corPadrao?: string
}) {
  if (dados.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-6">Sem dados ainda.</p>
  }
  const max = Math.max(...dados.map((d) => d.valor), 1)
  const fmt = formatar ?? ((v: number) => String(v))
  return (
    <div className="space-y-2.5">
      {dados.map((d) => (
        <div key={d.label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-600 truncate pr-2">{d.label}</span>
            <span className="text-xs font-semibold text-slate-800 tabular-nums flex-shrink-0">{fmt(d.valor)}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max((d.valor / max) * 100, 3)}%`, backgroundColor: d.cor ?? corPadrao }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Colunas verticais (ex: receita por dia) ──────────────────────────────────
export function ColunasVerticais({
  dados, formatar, cor = 'var(--tenant-primary)',
}: {
  dados: PontoSerie[]
  formatar?: (v: number) => string
  cor?: string
}) {
  const max = Math.max(...dados.map((d) => d.valor), 1)
  const fmt = formatar ?? ((v: number) => String(v))
  const todosZero = dados.every((d) => d.valor === 0)

  return (
    <div>
      <div className="flex items-end gap-1 h-32">
        {dados.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
            {/* tooltip */}
            <div className="absolute -top-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap">
              {fmt(d.valor)}
            </div>
            <div
              className="w-full rounded-t transition-all duration-500"
              style={{
                height: todosZero ? '2px' : `${Math.max((d.valor / max) * 100, d.valor > 0 ? 4 : 1)}%`,
                backgroundColor: d.valor > 0 ? cor : '#e2e8f0',
                opacity: d.valor > 0 ? 1 : 0.5,
              }}
            />
          </div>
        ))}
      </div>
      {/* eixo de labels — mostra só alguns para não poluir */}
      <div className="flex gap-1 mt-1.5">
        {dados.map((d, i) => (
          <span key={i} className="flex-1 text-center text-[9px] text-slate-400 tabular-nums">
            {i === 0 || i === dados.length - 1 || i === Math.floor(dados.length / 2) ? d.label : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
