import { describe, it, expect } from 'vitest'
import {
  somarDias, diaDaSemana, inicioSemana, diasDaSemana, nomeDiaCurto,
  diaDoMes, formatarDataLonga, agruparPorDia, chaveDataNoFuso, horaNoFuso,
} from './calendario'

describe('somarDias', () => {
  it('soma e subtrai dias', () => {
    expect(somarDias('2026-06-14', 1)).toBe('2026-06-15')
    expect(somarDias('2026-06-14', -1)).toBe('2026-06-13')
  })
  it('atravessa fim de mês', () => {
    expect(somarDias('2026-06-30', 1)).toBe('2026-07-01')
    expect(somarDias('2026-01-01', -1)).toBe('2025-12-31')
  })
})

describe('semana (começa à segunda)', () => {
  it('diaDaSemana: 0=dom..6=sáb', () => {
    expect(diaDaSemana('2026-06-14')).toBe(0) // domingo
    expect(diaDaSemana('2026-06-15')).toBe(1) // segunda
  })
  it('inicioSemana devolve a segunda', () => {
    // 2026-06-14 é domingo → segunda da sua semana é 2026-06-08
    expect(inicioSemana('2026-06-14')).toBe('2026-06-08')
    // 2026-06-15 é segunda → ela própria
    expect(inicioSemana('2026-06-15')).toBe('2026-06-15')
  })
  it('diasDaSemana devolve 7 chaves seg→dom', () => {
    const d = diasDaSemana('2026-06-15')
    expect(d).toHaveLength(7)
    expect(d[0]).toBe('2026-06-15')
    expect(d[6]).toBe('2026-06-21')
  })
})

describe('formatação', () => {
  it('nomeDiaCurto', () => {
    expect(nomeDiaCurto('2026-06-15')).toBe('Seg')
  })
  it('diaDoMes', () => {
    expect(diaDoMes('2026-06-15')).toBe('15')
  })
  it('formatarDataLonga', () => {
    expect(formatarDataLonga('2026-06-15')).toBe('15 jun 2026')
  })
})

describe('agruparPorDia', () => {
  it('agrupa e ordena por hora dentro do dia (UTC)', () => {
    const itens = [
      { start_at: '2026-06-15T14:00:00.000Z' },
      { start_at: '2026-06-15T09:00:00.000Z' },
      { start_at: '2026-06-16T10:00:00.000Z' },
    ]
    const m = agruparPorDia(itens, 'UTC')
    expect(m.get('2026-06-15')).toHaveLength(2)
    expect(m.get('2026-06-15')![0].start_at).toContain('09:00')
    expect(m.get('2026-06-16')).toHaveLength(1)
  })
})

describe('fuso', () => {
  it('chaveDataNoFuso e horaNoFuso usam o timezone', () => {
    // 23:30 UTC em Lisboa (verão, +1) → já é o dia seguinte 00:30
    const iso = '2026-06-15T23:30:00.000Z'
    expect(chaveDataNoFuso(iso, 'Europe/Lisbon')).toBe('2026-06-16')
    expect(horaNoFuso(iso, 'Europe/Lisbon')).toBe('00:30')
  })
})
