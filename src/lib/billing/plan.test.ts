import { describe, it, expect } from 'vitest'
import {
  subscricaoDaAcesso, limiteExcedido, podeAdicionar, precoDoCiclo, fimDoPeriodo,
  planoEhGratuito, subscricaoBloqueia, precoDoCicloMoeda,
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

  it('plano gratuito: preço 0 ou nulo', () => {
    expect(planoEhGratuito(0)).toBe(true)
    expect(planoEhGratuito(null)).toBe(true)
    expect(planoEhGratuito(29)).toBe(false)
  })

  it('preço por moeda: BRL usa preços próprios; EUR usa o base', () => {
    const pro = { price_monthly: 40, price_yearly: 400, features: { price_brl_monthly: 159, price_brl_yearly: 1590 } }
    expect(precoDoCicloMoeda(pro, 'monthly', 'EUR')).toBe(40)
    expect(precoDoCicloMoeda(pro, 'yearly',  'EUR')).toBe(400)
    expect(precoDoCicloMoeda(pro, 'monthly', 'BRL')).toBe(159)
    expect(precoDoCicloMoeda(pro, 'yearly',  'BRL')).toBe(1590)
    // sem preço BR definido → cai no base
    const semBR = { price_monthly: 40, price_yearly: 400, features: {} }
    expect(precoDoCicloMoeda(semBR, 'monthly', 'BRL')).toBe(40)
  })

  it('subscrição: gratuito nunca bloqueia; pago bloqueia em atraso/cancelado', () => {
    // Gratuito nunca bloqueia, mesmo cancelado
    expect(subscricaoBloqueia({ price_monthly: 0 }, 'canceled')).toBe(false)
    // Pago: ativo/trial passam; atraso/cancelado bloqueiam
    expect(subscricaoBloqueia({ price_monthly: 29 }, 'active')).toBe(false)
    expect(subscricaoBloqueia({ price_monthly: 29 }, 'trialing')).toBe(false)
    expect(subscricaoBloqueia({ price_monthly: 29 }, 'past_due')).toBe(true)
    expect(subscricaoBloqueia({ price_monthly: 29 }, 'canceled')).toBe(true)
  })
})
