// Schemas de validação do painel de administração (SUPERADMIN)
import { z } from 'zod'

// Criar uma nova empresa = criar o utilizador OWNER inicial.
// O SUPERADMIN define país e nicho AQUI (na criação) — o owner já não os escolhe
// no onboarding (ficam só leitura). O trigger provisiona o tenant + profile.
export const criarEmpresaSchema = z.object({
  email: z
    .string()
    .email('E-mail inválido')
    .max(255, 'E-mail demasiado longo'),
  // Mínimo 8 — alinhado com minimum_password_length do GoTrue
  password: z
    .string()
    .min(8, 'A palavra-passe deve ter pelo menos 8 caracteres')
    .max(72, 'A palavra-passe é demasiado longa'),
  full_name: z
    .string()
    .max(100, 'Nome demasiado longo')
    .optional()
    .or(z.literal('')),
  // País e nicho — definidos pelo superadmin, imutáveis depois
  country: z.enum(['PT', 'BR'], { error: 'Selecione o país' }),
  business_type: z.enum(
    ['estetica', 'veterinaria', 'barbearia', 'dentista', 'oficina', 'fisioterapia', 'outro'],
    { error: 'Selecione o nicho' }
  ),
})

export type CriarEmpresaInput = z.infer<typeof criarEmpresaSchema>
