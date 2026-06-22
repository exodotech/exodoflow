import { describe, it, expect } from 'vitest'
import { precisaLembrete, bookingsParaLembrar, corpoLembrete } from './lembretes'

const agora = '2026-06-15T12:00:00.000Z'

describe('precisaLembrete', () => {
  it('lembra marcação confirmada dentro da janela (24h)', () => {
    expect(precisaLembrete({ start_at: '2026-06-16T09:00:00.000Z', status: 'confirmed' }, agora, 24, false)).toBe(true)
  })
  it('não lembra fora da janela', () => {
    expect(precisaLembrete({ start_at: '2026-06-18T09:00:00.000Z', status: 'confirmed' }, agora, 24, false)).toBe(false)
  })
  it('não lembra marcação passada', () => {
    expect(precisaLembrete({ start_at: '2026-06-15T09:00:00.000Z', status: 'confirmed' }, agora, 24, false)).toBe(false)
  })
  it('não lembra canceladas/concluídas', () => {
    expect(precisaLembrete({ start_at: '2026-06-16T09:00:00.000Z', status: 'cancelled' }, agora, 24, false)).toBe(false)
    expect(precisaLembrete({ start_at: '2026-06-16T09:00:00.000Z', status: 'completed' }, agora, 24, false)).toBe(false)
  })
  it('não lembra duas vezes (já lembrado)', () => {
    expect(precisaLembrete({ start_at: '2026-06-16T09:00:00.000Z', status: 'confirmed' }, agora, 24, true)).toBe(false)
  })
})

describe('bookingsParaLembrar', () => {
  it('filtra com dedup por booking_id', () => {
    const bs = [
      { id: 'a', start_at: '2026-06-16T09:00:00.000Z', status: 'confirmed' },
      { id: 'b', start_at: '2026-06-16T10:00:00.000Z', status: 'confirmed' },
      { id: 'c', start_at: '2026-06-20T10:00:00.000Z', status: 'confirmed' },
    ]
    const r = bookingsParaLembrar(bs, agora, 24, new Set(['b']))
    expect(r.map((x) => x.id)).toEqual(['a'])
  })
})

describe('corpoLembrete', () => {
  it('inclui primeiro nome, serviço e hora', () => {
    const txt = corpoLembrete(
      { id: 'a', start_at: '2026-06-16T09:00:00.000Z', status: 'confirmed', client: { full_name: 'Maria Silva' }, service: { name: 'Limpeza de Pele' } },
      'UTC',
    )
    expect(txt).toContain('Maria')
    expect(txt).toContain('Limpeza de Pele')
    expect(txt).toContain('16/06')
  })
})
