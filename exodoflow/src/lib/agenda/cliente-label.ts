// Rótulo do "cliente" de uma marcação — distingue os 3 tipos. Função PURA.
//   - Marcação Rápida (is_quick) → "Marcação Rápida" + badge "Sem cadastro"
//   - Visitante (is_guest)       → nome + badge "Visitante"
//   - Cliente completo           → nome, sem badge

export type ClienteLabelVariant = 'default' | 'primary' | 'success' | 'warning' | 'error'

export interface ClienteLabelInfo {
  nome:   string
  badge:  string | null
  variant: ClienteLabelVariant
  isQuick: boolean
}

export function rotularClienteBooking(
  client?: { full_name?: string | null; is_guest?: boolean | null; is_quick?: boolean | null } | null,
): ClienteLabelInfo {
  if (client?.is_quick) {
    return { nome: 'Marcação Rápida', badge: 'Sem cadastro', variant: 'default', isQuick: true }
  }
  if (client?.is_guest) {
    return { nome: client.full_name ?? 'Visitante', badge: 'Visitante', variant: 'warning', isQuick: false }
  }
  return { nome: client?.full_name ?? '—', badge: null, variant: 'default', isQuick: false }
}
