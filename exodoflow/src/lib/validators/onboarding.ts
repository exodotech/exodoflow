// Schemas de validação Zod para cada passo do onboarding
// Nota: usa API Zod v4 (error: em vez de invalid_type_error:)
import { z } from 'zod'

// ─── PASSO 1 — Empresa ────────────────────────────────────────────────────────

export const step1EmpresaSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome da empresa deve ter pelo menos 2 caracteres')
    .max(100, 'Nome demasiado longo'),
  slug: z
    .string()
    .min(2, 'Identificador deve ter pelo menos 2 caracteres')
    .max(50, 'Identificador demasiado longo')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use apenas letras minúsculas, números e hífens'),
  country: z.enum(['PT', 'BR'], { error: 'Selecione Portugal ou Brasil' }),
  phone: z
    .string()
    .min(7, 'Telefone inválido')
    .max(20, 'Telefone demasiado longo')
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email('E-mail inválido')
    .optional()
    .or(z.literal('')),
})

export type Step1EmpresaInput = z.infer<typeof step1EmpresaSchema>


// ─── PASSO 2 — Nicho ─────────────────────────────────────────────────────────

export const step2NichoSchema = z.object({
  niche: z.enum(
    ['estetica', 'veterinaria', 'barbearia', 'dentista', 'oficina', 'fisioterapia'],
    { error: 'Selecione um tipo de negócio' }
  ),
})

export type Step2NichoInput = z.infer<typeof step2NichoSchema>


// ─── PASSO 3 — Primeiro Serviço ───────────────────────────────────────────────

export const step3ServicoSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome demasiado longo'),
  description: z
    .string()
    .max(500, 'Máximo 500 caracteres')
    .optional()
    .or(z.literal('')),
  duration_minutes: z
    .number({ error: 'Duração deve ser um número' })
    .int('Deve ser número inteiro')
    .min(5,  'Duração mínima: 5 minutos')
    .max(480, 'Duração máxima: 8 horas (480 minutos)'),
  price: z
    .number({ error: 'Preço deve ser um número' })
    .min(0, 'Preço não pode ser negativo')
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida — use formato hexadecimal: #6366f1'),
  is_active: z.boolean(),
})

export type Step3ServicoInput = z.infer<typeof step3ServicoSchema>


// ─── PASSO 4 — Primeiro Recurso ───────────────────────────────────────────────

export const step4RecursoSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome demasiado longo'),
  type: z.enum(['staff', 'room', 'equipment'], { error: 'Selecione o tipo de recurso' }),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida'),
  specialization: z
    .string()
    .max(100, 'Máximo 100 caracteres')
    .optional()
    .or(z.literal('')),
  link_to_profile: z.boolean(),
})

export type Step4RecursoInput = z.infer<typeof step4RecursoSchema>


// ─── PASSO 5 — Disponibilidade ────────────────────────────────────────────────

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/

export const horarioSchema = z.object({
  // Convenção PostgreSQL EXTRACT(DOW): 0=Domingo, 1=Segunda ... 6=Sábado
  // A coluna resource_availability.day_of_week tem CHECK (day_of_week BETWEEN 0 AND 6)
  day_of_week: z
    .number({ error: 'Dia da semana inválido' })
    .int()
    .min(0, 'Dia inválido (0=Domingo ... 6=Sábado)')
    .max(6, 'Dia inválido (0=Domingo ... 6=Sábado)'),
  start_time: z
    .string()
    .regex(timeRegex, 'Hora inválida — use formato HH:MM'),
  end_time: z
    .string()
    .regex(timeRegex, 'Hora inválida — use formato HH:MM'),
}).refine(
  (h) => h.start_time < h.end_time,
  { message: 'Hora de fim deve ser posterior à hora de início', path: ['end_time'] }
)

export const step5DisponibilidadeSchema = z.object({
  horarios: z
    .array(horarioSchema)
    .min(1, 'Defina pelo menos um horário de trabalho'),
})

export type Step5DisponibilidadeInput = z.infer<typeof step5DisponibilidadeSchema>
export type HorarioInput = z.infer<typeof horarioSchema>


// ─── PASSO 6 — Equipa ─────────────────────────────────────────────────────────

export const conviteSchema = z.object({
  email: z.string().email('E-mail inválido'),
  role: z.enum(['manager', 'receptionist', 'staff'], { error: 'Função inválida' }),
  resource_id: z.string().uuid('Recurso inválido').optional(),
}).refine(
  (c) => c.role !== 'staff' || !!c.resource_id,
  { message: 'STAFF deve ter um recurso (colaborador) associado', path: ['resource_id'] }
)

export const step6EquipaSchema = z.object({
  convites: z.array(conviteSchema),
})

export type Step6EquipaInput  = z.infer<typeof step6EquipaSchema>
export type ConviteInput      = z.infer<typeof conviteSchema>
