import type { Database } from '@/types/database'

// Status canónico de uma marcação — mantém-se alinhado com bookingStatusEnum em validators/booking.ts
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'

// Origem da marcação
export type BookingSource = 'manual' | 'whatsapp' | 'online' | 'api'

type _Row = Database['public']['Tables']['bookings']['Row']

// Marcação com status e source tipados (não string genérico)
export type Booking = Omit<_Row, 'status' | 'source'> & {
  status: BookingStatus
  source: BookingSource
}

type _InsertRow = Database['public']['Tables']['bookings']['Insert']
export type BookingInsert = Omit<_InsertRow, 'status' | 'source'> & {
  status?: BookingStatus
  source?: BookingSource
}

type _UpdateRow = Database['public']['Tables']['bookings']['Update']
export type BookingUpdate = Omit<_UpdateRow, 'status' | 'source'> & {
  status?: BookingStatus
  source?: BookingSource
}

// Registo de recurso associado a uma marcação (tabela de junção)
export type BookingResource = Database['public']['Tables']['booking_resources']['Row']

// Marcação com relações carregadas (para vistas de calendário e lista)
export type BookingWithRelations = Booking & {
  client?: { id: string; full_name: string; phone: string | null }
  service?: { id: string; name: string; color: string; duration_minutes: number; price: number | null }
  resources?: Array<{ id: string; name: string; type: string }>
}
