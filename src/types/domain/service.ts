import type { Database } from '@/types/database'
import type { ResourceType } from './resource'

type _Row = Database['public']['Tables']['services']['Row']

// Serviço com requires_resource_type tipado (não string genérico)
export type Service = Omit<_Row, 'requires_resource_type'> & {
  requires_resource_type: ResourceType | null
}

type _InsertRow = Database['public']['Tables']['services']['Insert']
export type ServiceInsert = Omit<_InsertRow, 'requires_resource_type'> & {
  requires_resource_type?: ResourceType | null
}

type _UpdateRow = Database['public']['Tables']['services']['Update']
export type ServiceUpdate = Omit<_UpdateRow, 'requires_resource_type'> & {
  requires_resource_type?: ResourceType | null
}
