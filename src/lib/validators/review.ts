// Schema de validação — Avaliações pós-atendimento.
import { z } from 'zod'
import { uuidLoose } from '@/lib/validators/uuid'

export const criarReviewSchema = z.object({
  client_id:  uuidLoose('Cliente inválido'),
  booking_id: uuidLoose('Marcação inválida').optional().or(z.literal('')),
  rating:     z.coerce.number({ message: 'Nota inválida' }).int().min(1, 'Mínimo 1').max(5, 'Máximo 5'),
  comment:    z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
})

export type CriarReviewInput = z.infer<typeof criarReviewSchema>
