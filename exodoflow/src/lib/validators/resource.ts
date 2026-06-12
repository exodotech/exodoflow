// Schemas de validação para recursos (colaboradores, salas, equipamentos)
import { z } from 'zod'

export const tipoRecursoEnum = z.enum(['staff', 'room', 'equipment'])

export const criarRecursoSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome demasiado longo'),
  type: tipoRecursoEnum,
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida — use formato hexadecimal: #6366f1')
    .default('#6366f1'),
  specialization: z
    .string()
    .max(100, 'Máximo 100 caracteres')
    .optional()
    .or(z.literal('')),
})

// Actualizar: todos os campos opcionais
export const atualizarRecursoSchema = criarRecursoSchema.partial()

export type CriarRecursoInput    = z.infer<typeof criarRecursoSchema>
export type AtualizarRecursoInput = z.infer<typeof atualizarRecursoSchema>
