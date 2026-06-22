// Helpers PUROS do módulo financeiro — resumo (dia/mês) e exportação CSV.
// Sem I/O: fáceis de testar. NÃO é contabilidade oficial.
import type { FinancialTransaction } from '@/types/domain/financas'
import { categoryLabel, paymentMethodLabel } from '@/types/domain/financas'

export interface ResumoFinanceiro {
  entradasDia: number
  saidasDia:   number
  saldoDia:    number
  entradasMes: number
  saidasMes:   number
  saldoMes:    number
}

// Soma entradas/saídas do DIA (hojeISO = 'YYYY-MM-DD') e do MÊS (prefixo 'YYYY-MM').
// As datas das transações estão em 'YYYY-MM-DD' (coluna DATE).
export function calcularResumo(
  transacoes: Pick<FinancialTransaction, 'type' | 'amount' | 'transaction_date'>[],
  hojeISO: string,
): ResumoFinanceiro {
  const mes = hojeISO.slice(0, 7) // 'YYYY-MM'
  const r: ResumoFinanceiro = {
    entradasDia: 0, saidasDia: 0, saldoDia: 0,
    entradasMes: 0, saidasMes: 0, saldoMes: 0,
  }
  for (const t of transacoes) {
    const noDia = t.transaction_date === hojeISO
    const noMes = t.transaction_date.startsWith(mes)
    if (t.type === 'income') {
      if (noMes) r.entradasMes += t.amount
      if (noDia) r.entradasDia += t.amount
    } else {
      if (noMes) r.saidasMes += t.amount
      if (noDia) r.saidasDia += t.amount
    }
  }
  r.saldoDia = r.entradasDia - r.saidasDia
  r.saldoMes = r.entradasMes - r.saidasMes
  return r
}

// Escapa um campo CSV (aspas, vírgulas, quebras de linha).
function csvField(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Gera CSV das transações (cabeçalho em PT). Não inclui dados sensíveis além do
// necessário ao controlo de caixa.
export function gerarCSVTransacoes(transacoes: FinancialTransaction[]): string {
  const header = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor', 'Moeda', 'Método']
  const linhas = transacoes.map((t) => [
    t.transaction_date,
    t.type === 'income' ? 'Entrada' : 'Saída',
    categoryLabel(t.category),
    t.description ?? '',
    t.amount.toFixed(2),
    t.currency,
    paymentMethodLabel(t.payment_method),
  ].map(csvField).join(','))
  return [header.join(','), ...linhas].join('\n')
}
