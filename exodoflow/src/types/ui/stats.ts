import type React from 'react'

// Informação de tendência para StatCard
export interface TrendInfo {
  value: number
  direction: 'up' | 'down'
}

// Dados completos para renderizar um StatCard
export interface StatCardData {
  label: string
  value: string | number
  icon?: React.ReactNode
  trend?: TrendInfo
}
