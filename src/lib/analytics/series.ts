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
