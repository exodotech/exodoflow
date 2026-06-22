// Schemas de validação para marcações (bookings)
// Usados com React Hook Form via zodResolver
import { z } from 'zod'

// Valores válidos para o status de uma marcação
export const bookingStatusEnum = z.enum([
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
])

// Schema para criar uma nova marcação
export const criarBookingSchema = z.object({
  client_id:    z.string().uuid('ID de cliente inválido'),
  service_id:   z.string().uuid('ID de serviço inválido'),
  start_at:     z.string().datetime('Data/hora de início inválida'),
  notes:        z.string().max(500, 'Máximo 500 caracteres').optional(),
  resource_ids: z
    .array(z.string().uuid('ID de recurso inválido'))
    .min(1, 'Seleccione pelo menos um recurso'),
})

// Schema para actualizar o status de uma marcação
export const atualizarStatusSchema = z.object({
  status:              bookingStatusEnum,
  cancellation_reason: z.string().max(300).optional(),
})

// Schema para reagendar uma marcação (nova data/hora e recursos)
export const reagendarBookingSchema = z.object({
  start_at:     z.string().datetime('Data/hora de início inválida'),
  end_at:       z.string().datetime('Data/hora de fim inválida'),
  resource_ids: z
    .array(z.string().uuid('ID de recurso inválido'))
    .min(1, 'Seleccione pelo menos um recurso'),
  notes: z.string().max(500).optional(),
})

// Tipos inferidos dos schemas
export type CriarBookingInput      = z.infer<typeof criarBookingSchema>
export type AtualizarStatusInput   = z.infer<typeof atualizarStatusSchema>
export type ReagendarBookingInput  = z.infer<typeof reagendarBookingSchema>
export type BookingStatus          = z.infer<typeof bookingStatusEnum>
