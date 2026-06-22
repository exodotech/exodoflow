import React from 'react'
import { cn } from '@/lib/utils/cn'
import type { MobileListItem } from '@/types/ui/common'

export interface MobileCardListProps {
  items: MobileListItem[]
  className?: string
  emptyMessage?: string
}

export function MobileCardList({
  items,
  className,
  emptyMessage = 'Nenhum item encontrado',
}: MobileCardListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {items.map((item) => (
        <div
          key={item.id}
          onClick={item.onClick}
          className={cn(
            'bg-white rounded-lg border border-gray-200 p-4',
            'flex items-start justify-between gap-3',
            item.onClick && 'cursor-pointer hover:border-gray-300 transition-colors'
          )}
        >
          {/* Left */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {item.icon && <div className="flex-shrink-0 mt-0.5">{item.icon}</div>}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 text-sm truncate">
                {item.title}
              </h3>
              {item.subtitle && (
                <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
              )}
              {item.description && (
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>
          </div>

          {/* Right */}
          {item.action && <div className="flex-shrink-0">{item.action}</div>}
        </div>
      ))}
    </div>
  )
}

export default MobileCardList
