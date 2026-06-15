import { z } from 'zod'

// UUID "tolerante": valida o formato 8-4-4-4-12 hex sem exigir os bits de
// versão/variante RFC. Necessário porque o z.uuid() (zod v4) é estrito e rejeita
// os UUIDs de SEED usados em dev (ex: c1000000-0000-0000-0000-000000000001).
// Em produção, os UUIDs reais (gen_random_uuid, v4) também passam.
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

export function uuidLoose(msg = 'Identificador inválido') {
  return z.string().regex(UUID_RE, msg)
}
