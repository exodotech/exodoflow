import { describe, it, expect } from 'vitest'
import { countryToLocale, isBrazil, isPortugal, DEFAULT_LOCALE } from './locale'
import { getCurrencyCode, formatCurrencyByCode } from './currency'

describe('countryToLocale — derivação país → locale', () => {
  it('PT → pt-PT, BR → pt-BR', () => {
    expect(countryToLocale('PT')).toBe('pt-PT')
    expect(countryToLocale('BR')).toBe('pt-BR')
  })
  it('é case-insensitive', () => {
    expect(countryToLocale('br')).toBe('pt-BR')
    expect(countryToLocale('pt')).toBe('pt-PT')
  })
  it('país desconhecido cai no locale por omissão', () => {
    expect(countryToLocale('XX')).toBe(DEFAULT_LOCALE)
    expect(DEFAULT_LOCALE).toBe('pt-PT')
  })
})

describe('isBrazil / isPortugal', () => {
  it('distingue os dois mercados', () => {
    expect(isBrazil('pt-BR')).toBe(true)
    expect(isBrazil('pt-PT')).toBe(false)
    expect(isPortugal('pt-PT')).toBe(true)
  })
})

describe('moeda', () => {
  it('código de moeda por locale', () => {
    expect(getCurrencyCode('pt-PT')).toBe('EUR')
    expect(getCurrencyCode('pt-BR')).toBe('BRL')
  })
  it('formatCurrencyByCode não lança para BRL/pt-BR (regressão do bug BR)', () => {
    expect(() => formatCurrencyByCode(45, 'BRL', 'pt-BR')).not.toThrow()
    expect(() => formatCurrencyByCode(45, 'EUR', 'pt-PT')).not.toThrow()
    // valor formatado contém o montante
    expect(formatCurrencyByCode(45, 'EUR', 'pt-PT')).toContain('45')
  })
})
