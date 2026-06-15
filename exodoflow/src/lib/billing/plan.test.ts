import { describe, it, expect } from 'vitest'
import {
  subscricaoDaAcesso, limiteExcedido, podeAdicionar, precoDoCiclo, fimDoPeriodo,
} from './plan'

describe('billing/plan', () => {
  it('trial e ativo dão acesso; cancelado/none não', () => {
    expect(subscricaoDaAcesso('trialing')).toBe(true)
    expect(subscricaoDaAcesso('active')).toBe(true)
    expect(subscricaoDaAcesso('canceled')).toBe(false)
    expect(subscricaoDaAcesso('none')).toBe(false)
  })

  it('limite null = ilimitado', () => {
    expect(limiteExcedido(9999, null)).toBe(false)
    expect(podeAdicionar(9999, null)).toBe(true)
  })

  it('limite atingido bloqueia', () => {
    expect(limiteExcedido(10, 10)).toBe(true)   // atingiu o teto
    expect(podeAdicionar(10, 10)).toBe(false)
    expect(podeAdicionar(9, 10)).toBe(true)
  })

  it('preço do ciclo: yearly cai para monthly se não houver anual', () => {
    expect(precoDoCiclo({ price_monthly: 20, price_yearly: 200 }, 'yearly')).toBe(200)
    expect(precoDoCiclo({ price_monthly: 20, price_yearly: null }, 'yearly')).toBe(20)
    expect(precoDoCiclo({ price_monthly: 20, price_yearly: 200 }, 'monthly')).toBe(20)
  })

  it('fim do período: +1 mês ou +1 ano', () => {
    const base = new Date('2026-01-15T00:00:00Z')
    expect(fimDoPeriodo('monthly', base).getUTCMonth()).toBe(1)   // fevereiro
    expect(fimDoPeriodo('yearly', base).getUTCFullYear()).toBe(2027)
  })
})
