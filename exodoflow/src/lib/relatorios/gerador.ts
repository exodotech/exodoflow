// Funções PURAS de geração de relatórios financeiros (F3).
// Sem I/O: testáveis isoladamente. NÃO é contabilidade oficial.
import { calcularResumo } from '@/lib/financas/resumo'
import { formatCurrencyByCode } from '@/lib/i18n/currency'
import type { FinancialTransaction } from '@/types/domain/financas'
import type { RelatorioGerado } from '@/types/domain/relatorios'
import type { SupportedLocale } from '@/types/domain/communication'

// Gera o relatório financeiro de UM DIA.
// hojeISO: 'YYYY-MM-DD'
export function gerarRelatorioDiario(
  transacoes: FinancialTransaction[],
  hojeISO:    string,
  currency:   string,
  locale:     SupportedLocale,
  nomeEmpresa?: string,
): RelatorioGerado {
  const r   = calcularResumo(transacoes, hojeISO)
  const fmt = (v: number) => formatCurrencyByCode(v, currency, locale)

  const linhas = transacoes.filter((t) => t.transaction_date === hojeISO)
  const totalLinhas = linhas.length

  const assunto = `[ExodoFlow] Relatório diário — ${hojeISO}${nomeEmpresa ? ` — ${nomeEmpresa}` : ''}`

  const corpo = [
    `Relatório de Caixa — ${hojeISO}`,
    nomeEmpresa ? `Empresa: ${nomeEmpresa}` : '',
    '',
    '── RESUMO DO DIA ──────────────────────',
    `Entradas:  ${fmt(r.entradasDia)}`,
    `Saídas:    ${fmt(r.saidasDia)}`,
    `Saldo:     ${fmt(r.saldoDia)}`,
    '',
    `Total de lançamentos: ${totalLinhas}`,
    '',
    '── NOTA ────────────────────────────────',
    'Este relatório é apenas um controlo interno de caixa.',
    'Não substitui contabilidade certificada.',
    '',
    '── ExodoFlow Pro ────────────────────────',
  ].filter((l) => l !== undefined).join('\n')

  return {
    tipo:    'relatorio_diario',
    periodo: hojeISO,
    assunto,
    corpo,
    resumo:  { entradas: r.entradasDia, saidas: r.saidasDia, saldo: r.saldoDia, currency },
  }
}

// Gera o relatório financeiro de UM MÊS.
// mesISO: 'YYYY-MM'
export function gerarRelatorioMensal(
  transacoes: FinancialTransaction[],
  mesISO:     string,
  currency:   string,
  locale:     SupportedLocale,
  nomeEmpresa?: string,
): RelatorioGerado {
  // Usa o primeiro dia do mês como âncora para calcularResumo
  const primeirodia = `${mesISO}-01`
  const doMes = transacoes.filter((t) => t.transaction_date.startsWith(mesISO))
  const r     = calcularResumo(doMes, primeirodia)
  const fmt   = (v: number) => formatCurrencyByCode(v, currency, locale)

  // Formatar o mês de forma legível (ex: "Junho 2026")
  const [ano, mes] = mesISO.split('-')
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const mesLabel = `${meses[parseInt(mes) - 1]} ${ano}`

  const assunto = `[ExodoFlow] Relatório mensal — ${mesLabel}${nomeEmpresa ? ` — ${nomeEmpresa}` : ''}`

  const corpo = [
    `Relatório de Caixa — ${mesLabel}`,
    nomeEmpresa ? `Empresa: ${nomeEmpresa}` : '',
    '',
    '── RESUMO DO MÊS ──────────────────────',
    `Entradas:  ${fmt(r.entradasMes)}`,
    `Saídas:    ${fmt(r.saidasMes)}`,
    `Saldo:     ${fmt(r.saldoMes)}`,
    '',
    `Total de lançamentos: ${doMes.length}`,
    '',
    '── NOTA ────────────────────────────────',
    'Este relatório é apenas um controlo interno de caixa.',
    'Não substitui contabilidade certificada.',
    '',
    '── ExodoFlow Pro ────────────────────────',
  ].filter((l) => l !== undefined).join('\n')

  return {
    tipo:    'relatorio_mensal',
    periodo: mesISO,
    assunto,
    corpo,
    resumo:  { entradas: r.entradasMes, saidas: r.saidasMes, saldo: r.saldoMes, currency },
  }
}
