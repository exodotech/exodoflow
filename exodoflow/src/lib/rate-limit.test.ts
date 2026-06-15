import { describe, it, expect } from 'vitest'
import { checkRateLimit, clientKeyFromRequest } from './rate-limit'

function req(headers: Record<string, string>): Request {
  return new Request('https://x.test/api', { headers })
}

describe('rate-limit/checkRateLimit', () => {
  it('permite até ao limite e bloqueia depois', () => {
    const key = `t-${Math.random()}`
    const opts = { limit: 3, windowMs: 60_000 }
    expect(checkRateLimit(key, opts).allowed).toBe(true)  // 1
    expect(checkRateLimit(key, opts).allowed).toBe(true)  // 2
    expect(checkRateLimit(key, opts).allowed).toBe(true)  // 3
    const quarto = checkRateLimit(key, opts)
    expect(quarto.allowed).toBe(false)                    // 4 -> bloqueado
    expect(quarto.headers['Retry-After']).toBeDefined()
  })
})

describe('rate-limit/clientKeyFromRequest (anti-spoofing)', () => {
  it('prefere x-real-ip ao x-forwarded-for forjado', () => {
    const r = req({ 'x-forwarded-for': '1.1.1.1, 9.9.9.9', 'x-real-ip': '203.0.113.7' })
    expect(clientKeyFromRequest(r)).toBe('203.0.113.7')
  })

  it('sem x-real-ip, usa o ÚLTIMO salto de x-forwarded-for (não o primeiro)', () => {
    // 1.1.1.1 é controlado pelo cliente (extremo esquerdo); 9.9.9.9 é o salto fiável
    const r = req({ 'x-forwarded-for': '1.1.1.1, 9.9.9.9' })
    expect(clientKeyFromRequest(r)).toBe('9.9.9.9')
  })

  it('sem headers de IP, devolve "unknown"', () => {
    expect(clientKeyFromRequest(req({}))).toBe('unknown')
  })
})
