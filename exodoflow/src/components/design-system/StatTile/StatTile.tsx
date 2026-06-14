import React from 'react'
import { cn } from '@/lib/utils/cn'

// Cartão de estatística compacto em vidro (glass). Usado nas listagens
// (Serviços, Recursos, Agenda) para um resumo rápido e consistente.
// Variante clicável quando recebe onClick (ex: filtrar a lista).
export interface StatTileProps {
  label:    string
  value:    React.ReactNode
  hint?:    string
  icon?:    React.ReactNode
  valueClassName?: string
  onClick?: () => void
}

export function StatTile({ label, value, hint, icon, valueClassName, onClick }: StatTileProps) {
  const Cmp = onClick ? 'button' : 'div'
  return (
    <Cmp
      onClick={onClick}
      className={cn(
        'text-left bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm p-4',
        onClick && 'hover:border-[color:var(--tenant-primary)] hover:-translate-y-0.5 transition-all cursor-pointer',
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        {icon && <span className="text-slate-300">{icon}</span>}
      </div>
      <p className={cn('text-2xl font-bold text-slate-900', valueClassName)}>{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
    </Cmp>
  )
}

export default StatTile
