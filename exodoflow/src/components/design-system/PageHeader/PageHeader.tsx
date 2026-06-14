import React from 'react'
import { cn } from '@/lib/utils/cn'
import type { BreadcrumbItem } from '@/types/ui/common'

export interface PageHeaderProps {
  title:        string
  description?: string
  action?:      React.ReactNode
  breadcrumbs?: BreadcrumbItem[]
  className?:   string
}

export function PageHeader({ title, description, action, breadcrumbs, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-8', className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && (
        <div className="mb-3 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-slate-300">/</span>}
              {crumb.href ? (
                <a href={crumb.href} className="hover:text-slate-600 transition-colors duration-150">
                  {crumb.label}
                </a>
              ) : (
                <span className="text-slate-600">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Barra accent na cor do tenant */}
      <div
        className="w-8 h-1 rounded-full mb-3"
        style={{ background: 'var(--tenant-primary)' }}
        aria-hidden
      />

      {/* Título + Acção */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 text-sm sm:text-base text-slate-500 leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {action && (
          <div className="flex-shrink-0 mt-0.5">{action}</div>
        )}
      </div>
    </div>
  )
}

export default PageHeader
