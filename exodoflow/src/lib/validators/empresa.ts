// Schema de validação para editar os dados da empresa (OWNER)
// NOTA: country e business_type (nicho) NÃO estão aqui — são imutáveis após a
// criação (definem locale/moeda/fuso/labels/templates). Ver migração 0018.
import { z } from 'zod'

export const atualizarEmpresaSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome da empresa deve ter pelo menos 2 caracteres')
    .max(100, 'Nome demasiado longo'),
  slug: z
    .string()
    .min(2, 'Identificador deve ter pelo menos 2 caracteres')
    .max(50, 'Identificador demasiado longo')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use apenas letras minúsculas, números e hífens'),
  phone: z
    .string()
    .max(20, 'Telefone demasiado longo')
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email('E-mail inválido')
    .optional()
    .or(z.literal('')),
  website: z
    .string()
    .max(200, 'Website demasiado longo')
    .optional()
    .or(z.literal('')),
  // Identificação fiscal: NIF (PT) ou CPF/CNPJ (BR) — texto livre operacional
  tax_id: z
    .string()
    .max(30, 'Identificação fiscal demasiado longa')
    .optional()
    .or(z.literal('')),
  // Tipo fiscal: PT→nif; BR escolhe cpf (Pessoa Física) ou cnpj (Pessoa Jurídica).
  // A coerência tipo↔país é garantida na UI (getTaxIdOptions) e na derivação do país.
  tax_id_type: z
    .enum(['nif', 'cpf', 'cnpj'])
    .optional(),
  // Morada (guardada em tenants.address JSONB). street = linha 1 (chave mantida
  // para não migrar dados existentes); address_line2 e region foram acrescentados.
  street:        z.string().max(200, 'Morada demasiado longa').optional().or(z.literal('')),
  address_line2: z.string().max(200, 'Complemento demasiado longo').optional().or(z.literal('')),
  city:          z.string().max(100, 'Cidade demasiado longa').optional().or(z.literal('')),
  region:        z.string().max(100, 'Região demasiado longa').optional().or(z.literal('')),
  postal_code:   z.string().max(20, 'Código postal inválido').optional().or(z.literal('')),
  // Presença online + observações internas (guardados em settings JSONB)
  instagram:      z.string().max(100, 'Instagram demasiado longo').optional().or(z.literal('')),
  facebook:       z.string().max(100, 'Facebook demasiado longo').optional().or(z.literal('')),
  google_maps_url:z.string().max(500, 'Link demasiado longo').optional().or(z.literal('')),
  internal_notes: z.string().max(2000, 'Máximo 2000 caracteres').optional().or(z.literal('')),
})

export type AtualizarEmpresaInput = z.infer<typeof atualizarEmpresaSchema>
