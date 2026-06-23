// Lógica de calendário — funções PURAS e testáveis. Trabalham com chaves de
// data 'YYYY-MM-DD' (strings) para evitar bugs de fuso horário ao agrupar/navegar.
// O fuso do tenant entra apenas para derivar a chave/hora de cada marcação.

// Chave de data ('YYYY-MM-DD') de um instante ISO no fuso indicado.
export function chaveDataNoFuso(iso: string, timezone: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: timezone })
}

// Hora ('HH:MM') de um instante ISO no fuso indicado.
export function horaNoFuso(iso: string, timezone: string): string {
  return new Date(iso).toLocaleTimeString('pt-PT', { timeZone: timezone, hour: '2-digit', minute: '2-digit' })
}

// Chave de hoje no fuso indicado.
export function hojeKey(timezone: string): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: timezone })
}

// Soma n dias a uma chave 'YYYY-MM-DD' (pode ser negativo). Usa UTC ao meio-dia
// para nunca ser afectado por horário de verão.
export function somarDias(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}

// Dia da semana de uma chave: 0=domingo ... 6=sábado.
export function diaDaSemana(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()
}

// Chave da segunda-feira da semana que contém `key` (semana começa à segunda).
export function inicioSemana(key: string): string {
  const dow = diaDaSemana(key)         // 0=dom..6=sáb
  const desvio = dow === 0 ? -6 : 1 - dow
  return somarDias(key, desvio)
}

// As 7 chaves da semana (segunda → domingo) que contém `key`.
export function diasDaSemana(key: string): string[] {
  const seg = inicioSemana(key)
  return Array.from({ length: 7 }, (_, i) => somarDias(seg, i))
}

const DIAS_CURTOS  = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES        = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

// 'Seg' (nome curto do dia da semana).
export function nomeDiaCurto(key: string): string {
  return DIAS_CURTOS[diaDaSemana(key)]
}

// '14' (dia do mês).
export function diaDoMes(key: string): string {
  return key.slice(8, 10)
}

// '14 jun 2026' (data por extenso curta).
export function formatarDataLonga(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return `${d} ${MESES[m - 1]} ${y}`
}

// Primeiro dia do mês ('YYYY-MM-01').
export function inicioMes(key: string): string {
  return key.slice(0, 7) + '-01'
}

// 'junho 2026' — nome por extenso do mês.
export function nomeMes(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${MESES_LONGOS[m - 1]} ${y}`
}

// Avança/recua n meses (pode ser negativo).
export function somarMeses(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1 + n, 1, 12))
  return dt.toISOString().slice(0, 10)
}

// Grid do mês: array de chaves incluindo dias de preenchimento do mês
// anterior e seguinte para formar semanas completas (Seg→Dom).
export function gridMes(key: string): { key: string; mesAtual: boolean }[] {
  const inicio   = inicioMes(key)
  const [y, m]   = inicio.split('-').map(Number)
  const diasMes  = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const dow1     = diaDaSemana(inicio)                        // 0=Dom
  const offset   = dow1 === 0 ? 6 : dow1 - 1                 // padding antes do dia 1

  const cells: { key: string; mesAtual: boolean }[] = []
  for (let i = offset; i > 0; i--)          cells.push({ key: somarDias(inicio, -i),      mesAtual: false })
  for (let d = 0; d < diasMes; d++)         cells.push({ key: somarDias(inicio, d),        mesAtual: true  })
  const resto = cells.length % 7
  if (resto > 0) {
    const ultimo = cells[cells.length - 1].key
    for (let i = 1; i <= 7 - resto; i++)    cells.push({ key: somarDias(ultimo, i),        mesAtual: false })
  }
  return cells
}

// Agrupa marcações por chave de data (no fuso do tenant).
export function agruparPorDia<T extends { start_at: string }>(
  itens: T[],
  timezone: string,
): Map<string, T[]> {
  const mapa = new Map<string, T[]>()
  for (const it of itens) {
    const k = chaveDataNoFuso(it.start_at, timezone)
    const arr = mapa.get(k) ?? []
    arr.push(it)
    mapa.set(k, arr)
  }
  // ordenar cada dia por hora
  for (const arr of mapa.values()) arr.sort((a, b) => a.start_at.localeCompare(b.start_at))
  return mapa
}
