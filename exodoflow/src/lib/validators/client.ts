// Schemas de validação para clientes
// Inclui campos RGPD/LGPD obrigatórios
import { z } from 'zod'

// Schema para criar um novo cliente com consentimento RGPD
export const criarClienteSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome demasiado longo'),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-()]{7,20}$/, 'Telefone inválido')
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email('E-mail inválido')
    .optional()
    .or(z.literal('')),
  birth_date:        z.string().date('Data de nascimento inválida').optional().or(z.literal('')),
  nif:               z.string().max(20, 'NIF/CPF inválido').optional().or(z.literal('')),
  notes:             z.string().max(1000, 'Máximo 1000 caracteres').optional(),
  // Consentimentos RGPD/LGPD — obrigatório registar a escolha do cliente
  marketing_consent: z.boolean().default(false),
})

// Schema para actualizar dados de um cliente existente
export const atualizarClienteSchema = criarClienteSchema.partial()

// Cliente visitante (cadastro rápido): só nome obrigatório + telefone opcional.
// Sem e-mail, NIF/CPF, morada ou consentimento de marketing.
export const criarVisitanteSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome demasiado longo'),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-()]{7,20}$/, 'Telefone inválido')
    .optional()
    .or(z.literal('')),
})

// Tipos inferidos
export type CriarClienteInput     = z.infer<typeof criarClienteSchema>
export type AtualizarClienteInput = z.infer<typeof atualizarClienteSchema>
export type CriarVisitanteInput   = z.infer<typeof criarVisitanteSchema>
