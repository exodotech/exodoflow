import React from 'react'
import { cn } from '@/lib/utils/cn'
import type { TrendInfo } from '@/types/ui/stats'

export interface StatCardProps {
  label:        string
  value:        string | number
  icon?:        React.ReactNode
  trend?:       TrendInfo
  className?:   string
  description?: string
}

export function StatCard({ label, value, icon, trend, className, description }: StatCardProps) {
  return (
    <div
      className={cn(
        // Glass card — fundo semi-transparente com blur leve
        'relative overflow-hidden rounded-xl',
        'bg-white/70 backdrop-blur-sm',
        'border border-white/60',
        'shadow-[0_2px_8px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]',
        // Hover: lift suave
        'transition-all duration-200',
        'hover:shadow-[0_8px_24px_rgba(15,23,42,0.10),0_2px_4px_rgba(15,23,42,0.06)]',
        'hover:-translate-y-0.5',
        'p-4 sm:p-5',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        {icon && (
          // Badge do ícone com um halo suave CENTRADO atrás dele (em vez de um
          // brilho preso ao canto, que fazia o ícone parecer descentrado).
          <div className="relative flex-shrink-0">
            <span
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full blur-xl opacity-20"
              style={{ background: 'var(--tenant-primary)' }}
            />
            <div
              className="relative flex items-center justify-center w-9 h-9 rounded-xl [&>svg]:w-[18px] [&>svg]:h-[18px] [&>svg]:block"
              style={{ background: 'color-mix(in srgb, var(--tenant-primary) 12%, transparent)', color: 'var(--tenant-primary)' }}
            >
              {icon}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          {description && (
            <p className="text-xs text-slate-400 mt-1">{description}</p>
          )}
        </div>
        {trend && (
          <div
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
              trend.direction === 'up'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            )}
          >
            <span>{trend.direction === 'up' ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default StatCard
