// Schemas de validação da gestão de equipa (OWNER)
import { z } from 'zod'

// Criar um membro de equipa = criar um utilizador que ENTRA no tenant do owner.
// Roles permitidos: manager, receptionist, staff. 'owner' não — há um por tenant.
// O role 'superadmin' nunca é atribuível por aqui (é administração do sistema).
export const criarMembroSchema = z.object({
  email: z
    .string()
    .email('E-mail inválido')
    .max(255, 'E-mail demasiado longo'),
  password: z
    .string()
    .min(8, 'A palavra-passe deve ter pelo menos 8 caracteres')
    .max(72, 'A palavra-passe é demasiado longa'),
  full_name: z
    .string()
    .max(100, 'Nome demasiado longo')
    .optional()
    .or(z.literal('')),
  role: z.enum(['manager', 'receptionist', 'staff'], {
    error: 'Função inválida',
  }),
  // Opcional: vincular um STAFF a um recurso humano existente (resources.profile_id).
  // Liga a agenda do colaborador ao seu recurso. Só faz sentido para role=staff.
  resource_id: z.string().uuid('Recurso inválido').optional().or(z.literal('')),
})

export type CriarMembroInput = z.infer<typeof criarMembroSchema>
