import { describe, it, expect } from 'vitest'
import { countryToLocale, isBrazil, isPortugal, DEFAULT_LOCALE } from './locale'
import { getCurrencyCode, formatCurrencyByCode } from './currency'
import {
  getTaxIdOptions, isTaxIdTypeForCountry, getTaxIdLabel,
  getTaxIdPlaceholder, defaultTaxIdType, validateTaxIdBasic,
} from './tax-id'
import { getLabels } from './labels'

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

describe('identificação fiscal PT/BR', () => {
  it('PT só tem NIF; BR tem CPF (PF) e CNPJ (PJ)', () => {
    expect(getTaxIdOptions('pt-PT').map((o) => o.type)).toEqual(['nif'])
    expect(getTaxIdOptions('pt-BR').map((o) => o.type)).toEqual(['cpf', 'cnpj'])
  })
  it('REGRA: nunca CPF/CNPJ para PT; nunca NIF para BR', () => {
    expect(isTaxIdTypeForCountry('cpf', 'pt-PT')).toBe(false)
    expect(isTaxIdTypeForCountry('cnpj', 'pt-PT')).toBe(false)
    expect(isTaxIdTypeForCountry('nif', 'pt-PT')).toBe(true)
    expect(isTaxIdTypeForCountry('nif', 'pt-BR')).toBe(false)
    expect(isTaxIdTypeForCountry('cpf', 'pt-BR')).toBe(true)
    expect(isTaxIdTypeForCountry('cnpj', 'pt-BR')).toBe(true)
  })
  it('tipo por omissão: PT→nif, BR→cpf', () => {
    expect(defaultTaxIdType('pt-PT')).toBe('nif')
    expect(defaultTaxIdType('pt-BR')).toBe('cpf')
  })
  it('label conforme país e tipo', () => {
    expect(getTaxIdLabel('pt-PT')).toBe('NIF')
    expect(getTaxIdLabel('pt-BR')).toBe('CPF')
    expect(getTaxIdLabel('pt-BR', 'cnpj')).toBe('CNPJ')
  })
  it('placeholder por tipo', () => {
    expect(getTaxIdPlaceholder('nif')).toBe('000 000 000')
    expect(getTaxIdPlaceholder('cpf')).toBe('000.000.000-00')
    expect(getTaxIdPlaceholder('cnpj')).toBe('00.000.000/0000-00')
  })
  it('validação básica por comprimento (nif 9, cpf 11, cnpj 14)', () => {
    expect(validateTaxIdBasic('123456789', 'nif')).toBe(true)
    expect(validateTaxIdBasic('123', 'nif')).toBe(false)
    expect(validateTaxIdBasic('12345678901', 'cpf')).toBe(true)
    expect(validateTaxIdBasic('12345678000199', 'cnpj')).toBe(true)
  })
})

describe('labels PT/BR — distrito/estado', () => {
  it('PT usa "distrito"; BR usa "estado"', () => {
    expect(getLabels('pt-PT').distrito).toBe('distrito')
    expect(getLabels('pt-BR').distrito).toBe('estado')
  })
})
