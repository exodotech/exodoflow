import { z } from 'zod'

// Registo de tratamento (ficha clínica por visita). Exige notas OU produtos.
export const criarTratamentoSchema = z.object({
  client_id:    z.string().uuid(),
  service_id:   z.string().uuid().optional().or(z.literal('')),
  performed_at: z.string().date('Data inválida').optional().or(z.literal('')),
  notes:        z.string().trim().max(2000, 'Máximo 2000 caracteres').optional().or(z.literal('')),
  products:     z.string().trim().max(1000, 'Máximo 1000 caracteres').optional().or(z.literal('')),
}).refine((d) => (d.notes && d.notes.length > 0) || (d.products && d.products.length > 0), {
  message: 'Escreva pelo menos as observações ou os produtos usados.',
  path: ['notes'],
})

export type CriarTratamentoInput = z.infer<typeof criarTratamentoSchema>
