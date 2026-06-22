import type React from 'react'

// Item de migalha de pão (breadcrumb)
export interface BreadcrumbItem {
  label: string
  href?: string
}

// Item de lista para MobileCardList
export interface MobileListItem {
  id: string | number
  title: string
  subtitle?: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  onClick?: () => void
}

// Estado de loading genérico
export interface LoadingState {
  isLoading: boolean
  message?: string
}

// Estado de lista vazia
export interface EmptyState {
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

// Resultado de chamada à API/serviço
export interface ApiResult<T> {
  data: T | null
  error: string | null
  loading: boolean
}

// Resultado paginado
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
