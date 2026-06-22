import { describe, it, expect } from 'vitest'
import { rotularClienteBooking } from './cliente-label'

describe('rotularClienteBooking', () => {
  it('Marcação Rápida (is_quick) → "Marcação Rápida" + badge "Sem cadastro"', () => {
    const r = rotularClienteBooking({ full_name: 'Marcação Rápida', is_quick: true, is_guest: true })
    expect(r.nome).toBe('Marcação Rápida')
    expect(r.badge).toBe('Sem cadastro')
    expect(r.isQuick).toBe(true)
  })
  it('Visitante (is_guest) → nome + badge "Visitante"', () => {
    const r = rotularClienteBooking({ full_name: 'Maria', is_guest: true })
    expect(r.nome).toBe('Maria')
    expect(r.badge).toBe('Visitante')
    expect(r.variant).toBe('warning')
    expect(r.isQuick).toBe(false)
  })
  it('Cliente completo → nome, sem badge', () => {
    const r = rotularClienteBooking({ full_name: 'João', is_guest: false, is_quick: false })
    expect(r.nome).toBe('João')
    expect(r.badge).toBeNull()
  })
  it('is_quick tem prioridade sobre is_guest', () => {
    const r = rotularClienteBooking({ full_name: 'X', is_guest: true, is_quick: true })
    expect(r.nome).toBe('Marcação Rápida')
  })
  it('sem cliente → fallback', () => {
    expect(rotularClienteBooking(null).nome).toBe('—')
  })
})
