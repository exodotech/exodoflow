// Schemas de validação para serviços do catálogo
// Nota: usa API Zod v4 (error: em vez de invalid_type_error:)
import { z } from 'zod'

// Tipos de recurso que um serviço pode requerer
export const tipoRecursoEnum = z.enum(['staff', 'room', 'equipment'])

// Schema para criar um novo serviço
export const criarServicoSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome demasiado longo'),
  description:      z.string().max(500, 'Máximo 500 caracteres').optional(),
  duration_minutes: z
    .number({ error: 'Duração deve ser um número' })
    .int('Duração deve ser número inteiro')
    .positive('Duração deve ser maior que 0')
    .max(480, 'Duração máxima: 8 horas (480 minutos)'),
  price: z
    .number({ error: 'Preço deve ser um número' })
    .min(0, 'Preço não pode ser negativo')
    .optional(),
  // Cor no formato hexadecimal para o calendário
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida — use formato hexadecimal: #6366f1')
    .default('#6366f1'),
  requires_resource_type: tipoRecursoEnum.optional(),
})

// Schema para actualizar um serviço existente
export const atualizarServicoSchema = criarServicoSchema.partial()

// Tipos inferidos
export type CriarServicoInput    = z.infer<typeof criarServicoSchema>
export type AtualizarServicoInput = z.infer<typeof atualizarServicoSchema>
export type TipoRecurso          = z.infer<typeof tipoRecursoEnum>
