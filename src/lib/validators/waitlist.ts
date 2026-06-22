// Schema de validação — Lista de espera.
import { z } from 'zod'
import { uuidLoose } from '@/lib/validators/uuid'

export const criarWaitlistSchema = z
  .object({
    client_id:      uuidLoose('Cliente inválido').optional().or(z.literal('')),
    contact_name:   z.string().max(120, 'Nome demasiado longo').optional().or(z.literal('')),
    contact_phone:  z.string().max(40, 'Telefone demasiado longo').optional().or(z.literal('')),
    service_id:     uuidLoose('Serviço inválido').optional().or(z.literal('')),
    resource_id:    uuidLoose('Profissional inválido').optional().or(z.literal('')),
    preferred_from: z.string().optional().or(z.literal('')),
    notes:          z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
  })
  // É preciso saber quem contactar: cliente registado OU nome de contacto.
  .refine((d) => !!d.client_id || !!(d.contact_name && d.contact_name.trim()), {
    message: 'Escolha um cliente ou indique um nome de contacto.',
    path: ['contact_name'],
  })

export type CriarWaitlistInput = z.infer<typeof criarWaitlistSchema>

export const WAITLIST_STATUS = ['waiting', 'contacted', 'scheduled', 'cancelled'] as const
export type WaitlistStatus = (typeof WAITLIST_STATUS)[number]
