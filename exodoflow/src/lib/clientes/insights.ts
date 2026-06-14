// Insights de clientes — funções PURAS (sem React, sem Supabase) e testáveis.
// Alimentam a página de clientes: aniversariantes, valor (nº visitas + última
// visita), deteção de inativos e exportação CSV. Linguagem orientada ao dono
// da clínica (não técnica).

export interface ClienteBase {
  id:          string
  full_name:   string
  phone?:      string | null
  email?:      string | null
  birth_date?: string | null   // 'YYYY-MM-DD'
  tags?:       string[] | null
  is_guest?:   boolean | null
  created_at:  string
}

// Estatística de marcações agregada por cliente.
export interface ClienteStats {
  total:       number            // nº de marcações (exclui canceladas)
  ultimaVisita: string | null    // ISO da última visita passada (ou null)
}

// ── Aniversários ─────────────────────────────────────────────────────────────

// Verdadeiro se o cliente faz anos no mês indicado (1-12). Ignora o ano.
export function fazAnosNoMes(birth_date: string | null | undefined, mes: number): boolean {
  if (!birth_date) return false
  const m = Number(birth_date.slice(5, 7))
  return m === mes
}

// Dia do mês do aniversário (para ordenar a lista de aniversariantes).
export function diaAniversario(birth_date: string): number {
  return Number(birth_date.slice(8, 10))
}

// ── Valor / frequência ───────────────────────────────────────────────────────

// Agrega marcações por cliente: conta as não-canceladas e regista a última
// visita passada. `bookings` deve ter client_id, start_at e status.
export function agregarStatsPorCliente(
  bookings: { client_id: string | null; start_at: string; status: string }[],
  agoraISO: string,
): Map<string, ClienteStats> {
  const mapa = new Map<string, ClienteStats>()
  for (const b of bookings) {
    if (!b.client_id || b.status === 'cancelled') continue
    const atual = mapa.get(b.client_id) ?? { total: 0, ultimaVisita: null }
    atual.total += 1
    // última visita = marcação mais recente que já passou
    if (b.start_at <= agoraISO && (atual.ultimaVisita === null || b.start_at > atual.ultimaVisita)) {
      atual.ultimaVisita = b.start_at
    }
    mapa.set(b.client_id, atual)
  }
  return mapa
}

// Cliente "inativo": já veio alguma vez mas não vem há mais de `meses` meses.
// Quem nunca veio NÃO conta como inativo (é um lead novo, não um perdido).
export function clienteInativo(stats: ClienteStats | undefined, agoraISO: string, meses = 3): boolean {
  if (!stats || !stats.ultimaVisita) return false
  const limite = new Date(agoraISO)
  limite.setMonth(limite.getMonth() - meses)
  return stats.ultimaVisita < limite.toISOString()
}

// ── Exportação CSV (abre no Excel) ───────────────────────────────────────────

function csvEscape(v: string): string {
  const s = v ?? ''
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Gera um CSV simples (separador ';' para compatibilidade com Excel PT/BR).
export function gerarCSVClientes(
  clientes: ClienteBase[],
  stats: Map<string, ClienteStats>,
  locale = 'pt-PT',
): string {
  const cab = ['Nome', 'Telefone', 'E-mail', 'Tipo', 'Etiquetas', 'Marcações', 'Última visita']
  const linhas = clientes.map((c) => {
    const s = stats.get(c.id)
    const ultima = s?.ultimaVisita ? new Date(s.ultimaVisita).toLocaleDateString(locale) : ''
    return [
      c.full_name,
      c.phone ?? '',
      c.email ?? '',
      c.is_guest ? 'Visitante' : 'Cliente',
      (c.tags ?? []).join(', '),
      String(s?.total ?? 0),
      ultima,
    ].map(csvEscape).join(';')
  })
  return [cab.join(';'), ...linhas].join('\n')
}

// ── Tags ─────────────────────────────────────────────────────────────────────

// Junta todas as etiquetas distintas usadas (para o filtro), ordenadas.
export function todasAsTags(clientes: ClienteBase[]): string[] {
  const set = new Set<string>()
  for (const c of clientes) for (const t of c.tags ?? []) set.add(t)
  return [...set].sort((a, b) => a.localeCompare(b))
}

// Converte texto livre ("vip, frequente") num array limpo de etiquetas.
export function parseTags(texto: string): string[] {
  return texto
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, 10) // limite sensato
}
