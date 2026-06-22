// Validadores Zod — Módulo de Relatórios Financeiros (F3)
import { z } from 'zod'

// Validação HH:MM (hora UTC para envio automático)
const horaEnvioRegex = /^([01]\d|2[0-3]):[0-5]\d$/

export const relatorioSettingsSchema = z.object({
  email_destino:    z.string().email('E-mail de destino inválido.'),
  hora_envio:       z.string().regex(horaEnvioRegex, 'Formato inválido. Use HH:MM (UTC).'),
  relatorio_diario: z.boolean(),
  relatorio_mensal: z.boolean(),
})

export type RelatorioSettingsInput = z.infer<typeof relatorioSettingsSchema>
