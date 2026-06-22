// Schema de validação para autenticação
import { z } from 'zod'

export const loginSchema = z.object({
  email:    z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Palavra-passe deve ter pelo menos 6 caracteres'),
})

export const registerSchema = z.object({
  email:           z.string().email('E-mail inválido'),
  password:        z.string().min(8, 'Palavra-passe deve ter pelo menos 8 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'As palavras-passe não coincidem',
  path:    ['confirmPassword'],
})

// Regra de palavra-passe FORTE (reutilizada no reset por e-mail e na troca pelo
// utilizador autenticado): 8+ caracteres, pelo menos 1 letra e 1 número.
export const strongPassword = z
  .string()
  .min(8, 'A palavra-passe deve ter pelo menos 8 caracteres')
  .max(72, 'A palavra-passe é demasiado longa')
  .regex(/[A-Za-z]/, 'Inclua pelo menos uma letra')
  .regex(/[0-9]/,    'Inclua pelo menos um número')

// "Esqueci a senha" — só e-mail
export const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
})

// Definir nova senha (reset por e-mail) — senha forte + confirmação igual
export const definirPasswordSchema = z.object({
  password:        strongPassword,
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'As palavras-passe não coincidem',
  path:    ['confirmPassword'],
})

export type LoginInput           = z.infer<typeof loginSchema>
export type RegisterInput        = z.infer<typeof registerSchema>
export type ForgotPasswordInput  = z.infer<typeof forgotPasswordSchema>
export type DefinirPasswordInput = z.infer<typeof definirPasswordSchema>
