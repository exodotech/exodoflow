import { z } from 'zod'
import { uuidLoose } from './uuid'

// Criar um pacote de sessões para um cliente.
export const criarPacoteSchema = z.object({
  client_id:      uuidLoose(),
  service_id:     uuidLoose().optional().or(z.literal('')),  // '' = qualquer serviço
  name:           z.string().trim().min(2, 'Nome demasiado curto').max(80, 'Nome demasiado longo'),
  total_sessions: z.coerce.number().int('Tem de ser inteiro').min(1, 'Mínimo 1 sessão').max(500, 'Máximo 500'),
  price:          z.coerce.number().min(0, 'Não pode ser negativo').max(99999).optional(),
  expires_at:     z.string().date('Data inválida').optional().or(z.literal('')),
})

export type CriarPacoteInput = z.infer<typeof criarPacoteSchema>
