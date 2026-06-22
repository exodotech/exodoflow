import React from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface ErrorStateProps {
  title: string
  description?: string
  action?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

export function ErrorState({
  title,
  description,
  action,
  icon = <AlertCircle className="w-12 h-12" />,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="text-red-200 mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-600 mb-6 max-w-xs">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}

export default ErrorState
