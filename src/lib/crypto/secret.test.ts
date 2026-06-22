import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { encryptSecret, decryptSecret, isEncrypted, isSecretEncryptionConfigured } from './secret'

// Chave de teste determinística (32 bytes) em base64.
const TEST_KEY = Buffer.alloc(32, 7).toString('base64')

describe('crypto/secret', () => {
  const original = process.env.SECRET_ENCRYPTION_KEY
  beforeEach(() => { process.env.SECRET_ENCRYPTION_KEY = TEST_KEY })
  afterEach(() => {
    if (original === undefined) delete process.env.SECRET_ENCRYPTION_KEY
    else process.env.SECRET_ENCRYPTION_KEY = original
  })

  it('faz round-trip (encripta e desencripta) com a chave', () => {
    const token = 'EAAG_super_secret_meta_access_token_123'
    const enc = encryptSecret(token)
    expect(enc).not.toBe(token)
    expect(isEncrypted(enc)).toBe(true)
    expect(decryptSecret(enc)).toBe(token)
  })

  it('produz cifras diferentes para o mesmo texto (IV aleatório)', () => {
    expect(encryptSecret('abc')).not.toBe(encryptSecret('abc'))
  })

  it('aceita valores legados em claro (compatibilidade)', () => {
    expect(decryptSecret('token-antigo-em-claro')).toBe('token-antigo-em-claro')
    expect(isEncrypted('token-antigo-em-claro')).toBe(false)
  })

  it('deteta adulteração (GCM) e lança', () => {
    const enc = encryptSecret('valor')
    const adulterado = enc.slice(0, -4) + (enc.endsWith('AAAA') ? 'BBBB' : 'AAAA')
    expect(() => decryptSecret(adulterado)).toThrow()
  })

  it('sem chave: encripta em claro (dev) e desencripta como está', () => {
    delete process.env.SECRET_ENCRYPTION_KEY
    expect(isSecretEncryptionConfigured()).toBe(false)
    const out = encryptSecret('claro')
    expect(out).toBe('claro')
    expect(decryptSecret(out)).toBe('claro')
  })

  it('chave inválida (não 32 bytes) lança', () => {
    process.env.SECRET_ENCRYPTION_KEY = 'curta'
    expect(() => encryptSecret('x')).toThrow()
  })
})
