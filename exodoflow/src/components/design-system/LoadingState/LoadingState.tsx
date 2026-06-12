import React from 'react'
import { cn } from '@/lib/utils/cn'

export interface LoadingStateProps {
  message?: string
  fullScreen?: boolean
  className?: string
}

export function LoadingState({
  message = 'Carregando...',
  fullScreen = false,
  className,
}: LoadingStateProps) {
  const content = (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      {/* Spinner */}
      <div className="mb-4">
        <div className="animate-spin">
          <div className="h-8 w-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
        </div>
      </div>
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        {content}
      </div>
    )
  }

  return <div className="py-12">{content}</div>
}

export default LoadingState
