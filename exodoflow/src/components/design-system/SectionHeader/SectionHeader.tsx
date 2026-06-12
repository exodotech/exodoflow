import React from 'react'
import { cn } from '@/lib/utils/cn'

export interface SectionHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function SectionHeader({
  title,
  description,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 mb-4 sm:mb-6',
        className
      )}
    >
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs sm:text-sm text-gray-600">{description}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

export default SectionHeader
