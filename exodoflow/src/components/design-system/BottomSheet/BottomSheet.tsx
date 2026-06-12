import React, { useEffect } from 'react'
import { cn } from '@/lib/utils/cn'

export interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  height?: 'sm' | 'md' | 'lg' | 'full'
  snapPoints?: number[]
  className?: string
  isDismissible?: boolean
}

const heightClasses = {
  sm: 'h-60',
  md: 'h-96',
  lg: 'h-screen',
  full: 'h-screen',
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  height = 'md',
  className,
  isDismissible = true,
}: BottomSheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black transition-opacity duration-300',
          isOpen ? 'bg-opacity-50' : 'bg-opacity-0'
        )}
        onClick={isDismissible ? onClose : undefined}
      />

      {/* Bottom Sheet */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl',
          'shadow-lg transition-transform duration-300 overflow-y-auto',
          heightClasses[height],
          isOpen ? 'translate-y-0' : 'translate-y-full',
          className
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1 w-12 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
        )}

        {/* Content */}
        <div className="p-4 pb-safe">{children}</div>
      </div>
    </div>
  )
}

export default BottomSheet
