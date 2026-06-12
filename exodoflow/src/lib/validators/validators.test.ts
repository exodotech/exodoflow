import { describe, it, expect } from 'vitest'
import { atualizarEmpresaSchema } from './empresa'
import { criarMembroSchema } from './equipa'
import { criarServicoSchema } from './service'

describe('atualizarEmpresaSchema', () => {
  const base = { name: 'Aurora', slug: 'aurora' }

  it('aceita dados mínimos válidos', () => {
    expect(atualizarEmpresaSchema.safeParse(base).success).toBe(true)
  })
  it('rejeita slug com maiúsculas/espaços', () => {
    expect(atualizarEmpresaSchema.safeParse({ ...base, slug: 'Aurora Clinic' }).success).toBe(false)
  })
  it('NÃO inclui country/business_type — país e nicho são imutáveis', () => {
    // O schema descarta campos extra; o tipo inferido não tem country/business_type
    const parsed = atualizarEmpresaSchema.parse({ ...base, country: 'BR', business_type: 'barbearia' })
    expect('country' in parsed).toBe(false)
    expect('business_type' in parsed).toBe(false)
  })
  it('aceita campos opcionais vazios (website, NIF, morada)', () => {
    const r = atualizarEmpresaSchema.safeParse({ ...base, website: '', tax_id: '', street: '', city: '', postal_code: '' })
    expect(r.success).toBe(true)
  })
})

describe('criarMembroSchema', () => {
  const base = { email: 'm@x.pt', password: 'segura12', role: 'receptionist' }

  it('aceita membro válido', () => {
    expect(criarMembroSchema.safeParse(base).success).toBe(true)
  })
  it('rejeita password curta (<8)', () => {
    expect(criarMembroSchema.safeParse({ ...base, password: 'curta' }).success).toBe(false)
  })
  it('rejeita role inválida (ex: owner não é atribuível por aqui)', () => {
    expect(criarMembroSchema.safeParse({ ...base, role: 'owner' }).success).toBe(false)
  })
})

describe('criarServicoSchema', () => {
  it('aceita serviço válido e aplica cor por omissão', () => {
    const r = criarServicoSchema.safeParse({ name: 'Limpeza', duration_minutes: 60 })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.color).toMatch(/^#[0-9a-fA-F]{6}$/)
  })
  it('rejeita duração não positiva', () => {
    expect(criarServicoSchema.safeParse({ name: 'X', duration_minutes: 0 }).success).toBe(false)
  })
})
