import { describe, it, expect } from 'vitest'
import {
  sessoesRestantes, percentagemUsada, pacoteEsgotado, pacoteExpirado,
  estadoPacote, podeConsumir,
} from './pacotes'

const hoje = '2026-06-15T12:00:00.000Z'

describe('pacotes — cálculos', () => {
  it('sessoesRestantes', () => {
    expect(sessoesRestantes({ total_sessions: 10, used_sessions: 3 })).toBe(7)
    expect(sessoesRestantes({ total_sessions: 5, used_sessions: 5 })).toBe(0)
  })
  it('percentagemUsada', () => {
    expect(percentagemUsada({ total_sessions: 10, used_sessions: 3 })).toBe(30)
    expect(percentagemUsada({ total_sessions: 0, used_sessions: 0 })).toBe(0)
  })
  it('pacoteEsgotado', () => {
    expect(pacoteEsgotado({ total_sessions: 10, used_sessions: 10 })).toBe(true)
    expect(pacoteEsgotado({ total_sessions: 10, used_sessions: 9 })).toBe(false)
  })
  it('pacoteExpirado', () => {
    expect(pacoteExpirado({ expires_at: '2026-01-01' }, hoje)).toBe(true)
    expect(pacoteExpirado({ expires_at: '2026-12-31' }, hoje)).toBe(false)
    expect(pacoteExpirado({ expires_at: null }, hoje)).toBe(false)
  })
})

describe('estadoPacote', () => {
  const base = { total_sessions: 10, used_sessions: 2, status: 'active', expires_at: null }
  it('ativo', () => expect(estadoPacote(base, hoje)).toBe('ativo'))
  it('cancelado', () => expect(estadoPacote({ ...base, status: 'cancelled' }, hoje)).toBe('cancelado'))
  it('esgotado', () => expect(estadoPacote({ ...base, used_sessions: 10 }, hoje)).toBe('esgotado'))
  it('expirado', () => expect(estadoPacote({ ...base, expires_at: '2026-01-01' }, hoje)).toBe('expirado'))
  it('podeConsumir só quando ativo', () => {
    expect(podeConsumir(base, hoje)).toBe(true)
    expect(podeConsumir({ ...base, used_sessions: 10 }, hoje)).toBe(false)
  })
})
