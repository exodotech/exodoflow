// Séries para gráficos — funções PURAS e testáveis. Transformam marcações em
// dados agregados para os gráficos do dashboard (sem dependências de charting).

export interface PontoSerie {
  label: string
  valor: number
  cor?:  string
}

interface BookingLite {
  start_at: string
  status:   string
  service?: { id?: string; name?: string; color?: string; price?: number | null } | null
}

// Chave de data local 'YYYY-MM-DD'.
function diaLocal(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

// Receita por dia nos últimos `dias` dias (inclui hoje). Conta o preço do serviço
// das marcações confirmed/completed. Devolve uma série contínua (dias sem receita
// = 0), do mais antigo para o mais recente.
export function receitaPorDia(bookings: BookingLite[], dias: number, agora = new Date()): PontoSerie[] {
  const hoje = new Date(agora); hoje.setHours(0, 0, 0, 0)
  // mapa dia→receita
  const mapa = new Map<string, number>()
  for (const b of bookings) {
    if (b.status !== 'confirmed' && b.status !== 'completed') continue
    const preco = b.service?.price ?? 0
    if (!preco) continue
    const k = diaLocal(b.start_at)
    mapa.set(k, (mapa.get(k) ?? 0) + preco)
  }
  const serie: PontoSerie[] = []
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoje); d.setDate(d.getDate() - i)
    const k = diaLocal(d.toISOString())
    serie.push({
      label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      valor: Math.round((mapa.get(k) ?? 0) * 100) / 100,
    })
  }
  return serie
}

// Top serviços por nº de marcações (não-canceladas). Devolve até `limite`.
export function marcacoesPorServico(bookings: BookingLite[], limite = 5): PontoSerie[] {
  const mapa = new Map<string, { valor: number; cor?: string }>()
  for (const b of bookings) {
    if (b.status === 'cancelled') continue
    const nome = b.service?.name
    if (!nome) continue
    const atual = mapa.get(nome) ?? { valor: 0, cor: b.service?.color ?? undefined }
    atual.valor += 1
    mapa.set(nome, atual)
  }
  return [...mapa.entries()]
    .map(([label, v]) => ({ label, valor: v.valor, cor: v.cor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, limite)
}

// Marcações por estado (para um donut/resumo). Devolve contagens.
export function marcacoesPorEstado(bookings: BookingLite[]): Record<string, number> {
  const r: Record<string, number> = {}
  for (const b of bookings) r[b.status] = (r[b.status] ?? 0) + 1
  return r
}

// Top serviços por receita (confirmed/completed). Devolve até `limite`.
export function receitaPorServico(bookings: BookingLite[], limite = 5): PontoSerie[] {
  const mapa = new Map<string, { valor: number; cor?: string }>()
  for (const b of bookings) {
    if (b.status !== 'confirmed' && b.status !== 'completed') continue
    const nome = b.service?.name
    if (!nome || !b.service?.price) continue
    const atual = mapa.get(nome) ?? { valor: 0, cor: b.service.color ?? undefined }
    atual.valor += b.service.price
    mapa.set(nome, atual)
  }
  return [...mapa.entries()]
    .map(([label, v]) => ({ label, valor: Math.round(v.valor * 100) / 100, cor: v.cor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, limite)
}

// Previsão de receita até ao fim do mês corrente, via projecção linear da média diária.
export function previsaoReceita(bookings: BookingLite[], agora = new Date()): { confirmada: number; prevista: number } {
  const mes = agora.getMonth()
  const ano = agora.getFullYear()
  const dia = agora.getDate()
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()

  const confirmada = bookings
    .filter((b) => {
      if (b.status !== 'confirmed' && b.status !== 'completed') return false
      const d = new Date(b.start_at)
      return d.getMonth() === mes && d.getFullYear() === ano
    })
    .reduce((s, b) => s + (b.service?.price ?? 0), 0)

  const mediaDiaria = dia > 0 ? confirmada / dia : 0
  const prevista = Math.round((confirmada + mediaDiaria * (diasNoMes - dia)) * 100) / 100
  return { confirmada: Math.round(confirmada * 100) / 100, prevista }
}

// Célula do heatmap: dia da semana (0=Seg … 6=Dom) × hora.
export interface HeatmapCell {
  dayOfWeek: number
  hour:      number
  count:     number
}

// Heatmap de marcações por dia da semana × hora (8h–20h). Exclui canceladas.
export function heatmapHorarios(bookings: BookingLite[]): HeatmapCell[] {
  const mapa = new Map<string, number>()
  for (const b of bookings) {
    if (b.status === 'cancelled') continue
    const d = new Date(b.start_at)
    const dow = (d.getDay() + 6) % 7  // 0=Seg … 6=Dom
    const hour = d.getHours()
    if (hour < 8 || hour > 20) continue
    const key = `${dow}-${hour}`
    mapa.set(key, (mapa.get(key) ?? 0) + 1)
  }
  const cells: HeatmapCell[] = []
  for (let dow = 0; dow < 7; dow++) {
    for (let hour = 8; hour <= 20; hour++) {
      cells.push({ dayOfWeek: dow, hour, count: mapa.get(`${dow}-${hour}`) ?? 0 })
    }
  }
  return cells
}

// Taxa de ocupação estimada: (marcações activas) / (máx possível no período).
// Usa a janela dos últimos `dias` dias. `slotsPerDay` = slots teóricos por dia.
export function taxaOcupacao(bookings: BookingLite[], dias: number, slotsPerDay = 8): number {
  const agora = new Date()
  const limiteInferior = new Date(agora)
  limiteInferior.setDate(limiteInferior.getDate() - dias)

  const activas = bookings.filter((b) => {
    if (b.status === 'cancelled' || b.status === 'no_show') return false
    const d = new Date(b.start_at)
    return d >= limiteInferior && d <= agora
  }).length

  const possivel = dias * slotsPerDay
  return possivel === 0 ? 0 : Math.min(Math.round((activas / possivel) * 100), 100)
}
