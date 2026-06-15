import { describe, it, expect } from 'vitest'
import { receitaPorDia, marcacoesPorServico, marcacoesPorEstado } from './series'

const hoje = new Date('2026-06-15T12:00:00')

function bk(start: string, status: string, name?: string, price?: number, color?: string) {
  return { start_at: start, status, service: name ? { name, price, color } : null }
}

describe('receitaPorDia', () => {
  it('série contínua com o nº de dias pedido (mais antigo→recente)', () => {
    const s = receitaPorDia([], 7, hoje)
    expect(s).toHaveLength(7)
    expect(s[6].label).toBe('15/06') // último = hoje
  })
  it('soma preço de confirmed/completed no dia certo; ignora outros estados', () => {
    const b = [
      bk('2026-06-15T10:00:00', 'completed', 'A', 50),
      bk('2026-06-15T14:00:00', 'confirmed', 'B', 30),
      bk('2026-06-15T16:00:00', 'cancelled', 'C', 99),
      bk('2026-06-15T17:00:00', 'pending',   'D', 99),
    ]
    const s = receitaPorDia(b, 3, hoje)
    expect(s[2].valor).toBe(80) // 50 + 30
  })
})

describe('marcacoesPorServico', () => {
  it('conta não-canceladas e ordena desc', () => {
    const b = [
      bk('2026-06-10T10:00:00', 'completed', 'Limpeza', 45, '#111'),
      bk('2026-06-11T10:00:00', 'confirmed', 'Limpeza', 45, '#111'),
      bk('2026-06-12T10:00:00', 'completed', 'Massagem', 65, '#222'),
      bk('2026-06-13T10:00:00', 'cancelled', 'Massagem', 65, '#222'),
    ]
    const s = marcacoesPorServico(b)
    expect(s[0]).toEqual({ label: 'Limpeza', valor: 2, cor: '#111' })
    expect(s[1]).toEqual({ label: 'Massagem', valor: 1, cor: '#222' })
  })
  it('respeita o limite', () => {
    const b = ['A', 'B', 'C', 'D', 'E', 'F'].map((n) => bk('2026-06-10T10:00:00', 'completed', n, 10))
    expect(marcacoesPorServico(b, 3)).toHaveLength(3)
  })
})

describe('marcacoesPorEstado', () => {
  it('conta por estado', () => {
    const b = [
      bk('2026-06-10T10:00:00', 'completed', 'A', 1),
      bk('2026-06-10T10:00:00', 'completed', 'B', 1),
      bk('2026-06-10T10:00:00', 'pending', 'C', 1),
    ]
    expect(marcacoesPorEstado(b)).toEqual({ completed: 2, pending: 1 })
  })
})
