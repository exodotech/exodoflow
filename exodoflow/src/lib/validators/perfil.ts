// Schemas de validação do perfil próprio (qualquer utilizador autenticado)
import { z } from 'zod'
import { strongPassword } from '@/lib/validators/auth'

// Editar os próprios dados — NUNCA inclui role/tenant (protegidos pelo trigger
// prevent_profile_self_escalation na migração 0015).
export const atualizarPerfilSchema = z.object({
  full_name: z
    .string()
    .min(2, 'O nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome demasiado longo'),
  phone: z
    .string()
    .max(20, 'Telefone inválido')
    .optional()
    .or(z.literal('')),
})

// Senha forte (8+, 1 letra, 1 número) — regra partilhada com o reset por e-mail.
export const alterarPasswordSchema = z.object({
  password:        strongPassword,
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'As palavras-passe não coincidem',
  path:    ['confirmPassword'],
})

export type AtualizarPerfilInput = z.infer<typeof atualizarPerfilSchema>
export type AlterarPasswordInput = z.infer<typeof alterarPasswordSchema>
