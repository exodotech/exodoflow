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
      {/* Brilho decorativo no canto superior direito */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-10"
        style={{ background: 'var(--tenant-primary)' }}
      />

      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        {icon && (
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ background: 'color-mix(in srgb, var(--tenant-primary) 12%, transparent)' }}
          >
            <span style={{ color: 'var(--tenant-primary)' }} className="[&>svg]:w-4 [&>svg]:h-4">
              {icon}
            </span>
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
