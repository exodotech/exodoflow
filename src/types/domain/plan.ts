import type { Database } from '@/types/database'

// Limites de utilização associados a um plano
export interface PlanLimits {
  max_bookings_month: number | null
  max_clients: number | null
  max_resources: number | null
  max_users: number | null
  max_messages: number | null
}

// Feature flags do plano (chave: nome da funcionalidade, valor: activo/inactivo)
export type PlanFeatureFlags = Record<string, boolean>

export type Plan = Database['public']['Tables']['plans']['Row']
export type PlanInsert = Database['public']['Tables']['plans']['Insert']
export type PlanUpdate = Database['public']['Tables']['plans']['Update']
