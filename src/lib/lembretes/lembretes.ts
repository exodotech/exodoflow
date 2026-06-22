// Lógica de lembretes de marcação — funções PURAS e testáveis.
// Decide que marcações precisam de lembrete (dentro da janela, futuras, ativas
// e ainda não lembradas) e compõe o corpo da mensagem.

export interface BookingLembrete {
  id:       string
  start_at: string
  status:   string
  client?:  { full_name?: string | null; phone?: string | null } | null
  service?: { name?: string | null } | null
}

const ESTADOS_ATIVOS = new Set(['pending', 'confirmed'])

// Uma marcação precisa de lembrete se: está ativa (pendente/confirmada), começa
// no intervalo (agora, agora+janela], e ainda não tem lembrete registado.
export function precisaLembrete(
  b: Pick<BookingLembrete, 'start_at' | 'status'>,
  agoraISO: string,
  janelaHoras: number,
  jaLembrado: boolean,
): boolean {
  if (jaLembrado) return false
  if (!ESTADOS_ATIVOS.has(b.status)) return false
  const agora = new Date(agoraISO).getTime()
  const inicio = new Date(b.start_at).getTime()
  const limite = agora + janelaHoras * 60 * 60 * 1000
  return inicio > agora && inicio <= limite
}

// Filtra a lista de marcações que precisam de lembrete (recebe o conjunto de
// booking_ids já lembrados para dedup).
export function bookingsParaLembrar(
  bookings: BookingLembrete[],
  agoraISO: string,
  janelaHoras: number,
  jaLembrados: Set<string>,
): BookingLembrete[] {
  return bookings.filter((b) => precisaLembrete(b, agoraISO, janelaHoras, jaLembrados.has(b.id)))
}

// Compõe o corpo do lembrete (texto simples, pt-PT/pt-BR neutro).
export function corpoLembrete(b: BookingLembrete, timezone: string): string {
  const nome = b.client?.full_name?.split(' ')[0] ?? 'Olá'
  const servico = b.service?.name ?? 'a sua marcação'
  const dt = new Date(b.start_at)
  const dia = dt.toLocaleDateString('pt-PT', { timeZone: timezone, day: '2-digit', month: '2-digit' })
  const hora = dt.toLocaleTimeString('pt-PT', { timeZone: timezone, hour: '2-digit', minute: '2-digit' })
  return `Olá ${nome}! Lembrete da sua marcação de ${servico} em ${dia} às ${hora}. Até breve! 🌿`
}
