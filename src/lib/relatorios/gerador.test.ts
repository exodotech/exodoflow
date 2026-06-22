import { describe, it, expect } from 'vitest'
import { gerarRelatorioDiario, gerarRelatorioMensal } from './gerador'
import type { FinancialTransaction } from '@/types/domain/financas'

function tx(p: Partial<FinancialTransaction>): FinancialTransaction {
  return {
    id: 'x', tenant_id: 't', type: 'income', category: 'servico', description: null,
    amount: 0, currency: 'EUR', payment_method: 'dinheiro', transaction_date: '2026-06-14',
    booking_id: null, client_id: null, created_by: null,
    created_at: '', updated_at: '', deleted_at: null, ...p,
  }
}

const transacoes: FinancialTransaction[] = [
  tx({ type: 'income',  amount: 200, transaction_date: '2026-06-14' }),
  tx({ type: 'expense', amount: 50,  transaction_date: '2026-06-14' }),
  tx({ type: 'income',  amount: 100, transaction_date: '2026-06-10' }), // mês, não hoje
  tx({ type: 'income',  amount: 999, transaction_date: '2026-05-30' }), // mês anterior
]

describe('gerarRelatorioDiario', () => {
  const r = gerarRelatorioDiario(transacoes, '2026-06-14', 'EUR', 'pt-PT', 'Clínica Teste')

  it('tipo e período correctos', () => {
    expect(r.tipo).toBe('relatorio_diario')
    expect(r.periodo).toBe('2026-06-14')
  })
  it('assunto contém a data e empresa', () => {
    expect(r.assunto).toContain('2026-06-14')
    expect(r.assunto).toContain('Clínica Teste')
  })
  it('resumo do DIA (excluí outros dias)', () => {
    expect(r.resumo.entradas).toBe(200)
    expect(r.resumo.saidas).toBe(50)
    expect(r.resumo.saldo).toBe(150)
  })
  it('corpo menciona o saldo', () => {
    expect(r.corpo).toContain('150')
  })
})

describe('gerarRelatorioMensal', () => {
  const r = gerarRelatorioMensal(transacoes, '2026-06', 'EUR', 'pt-PT')

  it('tipo e período correctos', () => {
    expect(r.tipo).toBe('relatorio_mensal')
    expect(r.periodo).toBe('2026-06')
  })
  it('assunto contém o mês por extenso', () => {
    expect(r.assunto).toContain('Junho 2026')
  })
  it('resumo do MÊS (exclui mês anterior)', () => {
    expect(r.resumo.entradas).toBe(300) // 200 + 100
    expect(r.resumo.saidas).toBe(50)
    expect(r.resumo.saldo).toBe(250)
  })
  it('corpo não contém 999 (mês anterior)', () => {
    expect(r.corpo).not.toContain('999')
  })
})
