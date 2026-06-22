// Lógica de pacotes de sessões — funções PURAS e testáveis.

export interface PacoteBase {
  total_sessions: number
  used_sessions:  number
  status:         string
  expires_at?:    string | null
}

// Sessões que ainda restam (nunca negativo).
export function sessoesRestantes(p: Pick<PacoteBase, 'total_sessions' | 'used_sessions'>): number {
  return Math.max(0, p.total_sessions - p.used_sessions)
}

// Percentagem usada (0–100), para a barra de progresso.
export function percentagemUsada(p: Pick<PacoteBase, 'total_sessions' | 'used_sessions'>): number {
  if (p.total_sessions <= 0) return 0
  return Math.min(100, Math.round((p.used_sessions / p.total_sessions) * 100))
}

// Pacote esgotado (todas as sessões usadas).
export function pacoteEsgotado(p: Pick<PacoteBase, 'total_sessions' | 'used_sessions'>): boolean {
  return p.used_sessions >= p.total_sessions
}

// Pacote expirado por data (se tiver expires_at no passado).
export function pacoteExpirado(p: Pick<PacoteBase, 'expires_at'>, hojeISO: string): boolean {
  if (!p.expires_at) return false
  return p.expires_at < hojeISO.slice(0, 10)
}

// Estado legível para a UI.
export type EstadoPacote = 'ativo' | 'esgotado' | 'expirado' | 'cancelado'

export function estadoPacote(p: PacoteBase, hojeISO: string): EstadoPacote {
  if (p.status === 'cancelled') return 'cancelado'
  if (pacoteExpirado(p, hojeISO)) return 'expirado'
  if (pacoteEsgotado(p)) return 'esgotado'
  return 'ativo'
}

// Pode consumir uma sessão? (ativo, com saldo, não expirado)
export function podeConsumir(p: PacoteBase, hojeISO: string): boolean {
  return estadoPacote(p, hojeISO) === 'ativo'
}
