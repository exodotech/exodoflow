import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  position?: 'left' | 'right'
  width?: 'sm' | 'md' | 'lg'
  closeButton?: boolean
  className?: string
}

const widthClasses = {
  sm: 'w-64',
  md: 'w-80',
  lg: 'w-96',
}

const positionClasses = {
  left: 'left-0',
  right: 'right-0',
}

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  position = 'left',
  width = 'md',
  closeButton = true,
  className,
}: DrawerProps) {
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
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'absolute top-0 bottom-0 bg-white shadow-lg transition-transform duration-300 overflow-y-auto',
          widthClasses[width],
          positionClasses[position],
          isOpen ? 'translate-x-0' : position === 'left' ? '-translate-x-full' : 'translate-x-full',
          className
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {closeButton && (
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

export default Drawer
