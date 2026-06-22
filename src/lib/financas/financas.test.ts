import { describe, it, expect } from 'vitest'
import { calcularResumo, gerarCSVTransacoes } from './resumo'
import type { FinancialTransaction } from '@/types/domain/financas'

function tx(p: Partial<FinancialTransaction>): FinancialTransaction {
  return {
    id: 'x', tenant_id: 't', type: 'income', category: 'servico', description: null,
    amount: 0, currency: 'EUR', payment_method: 'dinheiro', transaction_date: '2026-06-12',
    booking_id: null, client_id: null, created_by: null,
    created_at: '', updated_at: '', deleted_at: null, ...p,
  }
}

describe('calcularResumo — dia e mês', () => {
  const hoje = '2026-06-12'
  const transacoes = [
    tx({ type: 'income',  amount: 100, transaction_date: '2026-06-12' }), // hoje
    tx({ type: 'expense', amount: 30,  transaction_date: '2026-06-12' }), // hoje
    tx({ type: 'income',  amount: 50,  transaction_date: '2026-06-05' }), // mês, não hoje
    tx({ type: 'income',  amount: 999, transaction_date: '2026-05-30' }), // outro mês
  ]
  const r = calcularResumo(transacoes, hoje)

  it('soma o dia correctamente', () => {
    expect(r.entradasDia).toBe(100)
    expect(r.saidasDia).toBe(30)
    expect(r.saldoDia).toBe(70)
  })
  it('soma o mês (exclui outro mês)', () => {
    expect(r.entradasMes).toBe(150)   // 100 + 50 (não conta os 999 de Maio)
    expect(r.saidasMes).toBe(30)
    expect(r.saldoMes).toBe(120)
  })
  it('saldo pode ser negativo', () => {
    const neg = calcularResumo([tx({ type: 'expense', amount: 200, transaction_date: hoje })], hoje)
    expect(neg.saldoDia).toBe(-200)
  })
})

describe('gerarCSVTransacoes', () => {
  it('gera cabeçalho + linha e escapa vírgulas/aspas', () => {
    const csv = gerarCSVTransacoes([
      tx({ type: 'expense', amount: 12.5, category: 'renda', description: 'Sala, andar 2', payment_method: 'transferencia' }),
    ])
    const linhas = csv.split('\n')
    expect(linhas[0]).toBe('Data,Tipo,Categoria,Descrição,Valor,Moeda,Método')
    expect(linhas[1]).toContain('Saída')
    expect(linhas[1]).toContain('12.50')
    expect(linhas[1]).toContain('"Sala, andar 2"')  // descrição com vírgula entre aspas
  })
})
