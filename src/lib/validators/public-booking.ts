import { z } from 'zod'
import { uuidLoose } from './uuid'

// Payload do POST de marcação pública (portal). Dados mínimos do visitante.
export const marcacaoPublicaSchema = z.object({
  service_id:  uuidLoose('Serviço inválido'),
  resource_id: uuidLoose('Profissional inválido'),
  start_at:    z.string().min(10, 'Início inválido'),
  end_at:      z.string().min(10, 'Fim inválido'),
  name:        z.string().trim().min(2, 'Indique o seu nome').max(100, 'Nome demasiado longo'),
  phone:       z.string().trim().regex(/^\+?[\d\s\-()]{7,20}$/, 'Telefone inválido').optional().or(z.literal('')),
})

export type MarcacaoPublicaInput = z.infer<typeof marcacaoPublicaSchema>
