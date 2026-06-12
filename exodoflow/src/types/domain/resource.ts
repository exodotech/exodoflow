import type { Database } from '@/types/database'

// Tipo de recurso disponível na plataforma
export type ResourceType = 'staff' | 'room' | 'equipment'

type _Row = Database['public']['Tables']['resources']['Row']

// Recurso com type tipado (não string genérico)
export type Resource = Omit<_Row, 'type'> & { type: ResourceType }

type _InsertRow = Database['public']['Tables']['resources']['Insert']
export type ResourceInsert = Omit<_InsertRow, 'type'> & { type: ResourceType }

type _UpdateRow = Database['public']['Tables']['resources']['Update']
export type ResourceUpdate = Omit<_UpdateRow, 'type'> & { type?: ResourceType }

// Disponibilidade semanal do recurso (horário recorrente)
export type ResourceAvailability = Database['public']['Tables']['resource_availability']['Row']

// Bloqueio manual de tempo (férias, ausência, indisponibilidade)
export type ResourceBlock = Database['public']['Tables']['resource_blocks']['Row']

// Recurso com disponibilidade e bloqueios carregados
export type ResourceWithAvailability = Resource & {
  availability?: ResourceAvailability[]
  blocks?: ResourceBlock[]
}
