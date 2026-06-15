// Schemas de validação do painel de administração (SUPERADMIN)
import { z } from 'zod'
import { uuidLoose } from './uuid'

// Nichos de negócio suportados (alinhado com o CHECK constraint da BD)
const NICHE_VALUES = ['estetica', 'veterinaria', 'barbearia', 'dentista', 'oficina', 'fisioterapia', 'outro'] as const

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


// Editar dados de uma empresa existente (SUPERADMIN). País fica de fora — tem
// fluxo dedicado (AlterarPaisModal) por ser operação fiscal sensível.
const optionalTrimmed = (max: number, msg: string) =>
  z.string().trim().max(max, msg).optional().or(z.literal(''))

export const editarEmpresaSchema = z.object({
  name:  z.string().trim().min(2, 'Nome demasiado curto').max(120, 'Nome demasiado longo'),
  slug:  z.string().trim()
    .min(2, 'Slug demasiado curto').max(60, 'Slug demasiado longo')
    .regex(/^[a-z0-9-]+$/, 'Só letras minúsculas, números e hífens'),
  phone:           optionalTrimmed(30, 'Telefone demasiado longo'),
  email:           z.string().trim().email('E-mail inválido').max(255).optional().or(z.literal('')),
  business_type:   z.enum(NICHE_VALUES, { error: 'Selecione o nicho' }),
  website:         optionalTrimmed(255, 'Website demasiado longo'),
  instagram:       optionalTrimmed(120, 'Instagram demasiado longo'),
  facebook:        optionalTrimmed(255, 'Facebook demasiado longo'),
  google_maps_url: optionalTrimmed(500, 'Link demasiado longo'),
  admin_notes:     optionalTrimmed(2000, 'Notas demasiado longas'),
})

export type EditarEmpresaInput = z.infer<typeof editarEmpresaSchema>


// Criar/editar um plano (SUPERADMIN). Preços e limites; null = ilimitado.
// Campo vazio ("") deve virar null (ilimitado), não 0 — daí o preprocess.
const intOrNull = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : v),
  z.coerce.number().int('Tem de ser inteiro').min(0, 'Não pode ser negativo').nullable(),
)
const priceField = z.coerce.number().min(0, 'Não pode ser negativo').max(99999, 'Valor demasiado alto')

export const planoSchema = z.object({
  name:  z.string().trim().min(2, 'Nome demasiado curto').max(60, 'Nome demasiado longo'),
  slug:  z.string().trim()
    .min(2, 'Slug demasiado curto').max(40, 'Slug demasiado longo')
    .regex(/^[a-z0-9-]+$/, 'Só letras minúsculas, números e hífens'),
  price_monthly: priceField,
  price_yearly:  priceField,
  max_resources: intOrNull,
  max_clients:   intOrNull,
  max_users:     intOrNull,
  is_active:     z.boolean(),
  sort_order:    z.coerce.number().int().min(0).max(999),
})

export type PlanoInput = z.infer<typeof planoSchema>


// Gerir o acesso do OWNER de uma empresa (SUPERADMIN, via service_role).
// Acção 'reset_password' define uma nova palavra-passe temporária para o owner.
export const gerirOwnerSchema = z.object({
  tenant_id: uuidLoose('Empresa inválida'),
  owner_id:  uuidLoose('Owner inválido'),
  action:    z.enum(['reset_password'], { error: 'Acção inválida' }),
  password:  z.string().min(8, 'A palavra-passe deve ter pelo menos 8 caracteres').max(72, 'Demasiado longa'),
})

export type GerirOwnerInput = z.infer<typeof gerirOwnerSchema>
