import React from 'react'
import { cn } from '@/lib/utils/cn'
import type { TrendInfo } from '@/types/ui/stats'

export interface StatCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  trend?: TrendInfo
  className?: string
  // Texto de contexto exibido abaixo do valor (ex.: explicação de "—")
  description?: string
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  className,
  description,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-gray-200 p-4 sm:p-6',
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs sm:text-sm font-medium text-gray-600">{label}</p>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">
            {value}
          </p>
          {description && (
            <p className="text-xs text-gray-400 mt-1">{description}</p>
          )}
        </div>
        {trend && (
          <div
            className={cn(
              'text-xs font-medium flex items-center gap-1',
              trend.direction === 'up'
                ? 'text-green-600'
                : 'text-red-600'
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
