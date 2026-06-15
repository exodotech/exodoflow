// Validação — Pedidos de titulares de dados (LGPD/RGPD).
import { z } from 'zod'

export const DSR_TYPES = ['acesso', 'correcao', 'exclusao', 'anonimizacao', 'exportacao', 'restricao', 'oposicao'] as const
export const DSR_STATUS = ['received', 'in_progress', 'completed', 'rejected'] as const

export type DsrType = (typeof DSR_TYPES)[number]
export type DsrStatus = (typeof DSR_STATUS)[number]

export const criarDsrSchema = z.object({
  requester_name:  z.string().min(2, 'Indique o nome do requerente').max(120, 'Nome demasiado longo'),
  requester_email: z.string().email('Email inválido').optional().or(z.literal('')),
  request_type:    z.enum(DSR_TYPES),
  notes:           z.string().max(1000, 'Máximo 1000 caracteres').optional().or(z.literal('')),
})

export type CriarDsrInput = z.infer<typeof criarDsrSchema>
