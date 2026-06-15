import { describe, it, expect } from 'vitest'
import { detetarIntencao, gerarRespostaAssistente, type ContextoAssistente } from './responder'

const ctx: ContextoAssistente = {
  nome: 'Clínica Aurora',
  servicos: [{ name: 'Limpeza de Pele', price: 45 }, { name: 'Massagem', price: 65 }],
  portalUrl: 'https://app/marcar/aurora',
  morada: 'Rua X, Lisboa',
  telefone: '912345678',
  moeda: 'EUR',
}

describe('detetarIntencao', () => {
  it('deteta saudação, serviços, preços, horário, morada, marcação', () => {
    expect(detetarIntencao('Olá bom dia')).toBe('saudacao')
    expect(detetarIntencao('que serviços oferecem?')).toBe('servicos')
    expect(detetarIntencao('quanto custa a limpeza?')).toBe('precos')
    expect(detetarIntencao('a que horas abrem?')).toBe('horario')
    expect(detetarIntencao('onde ficam?')).toBe('morada')
    expect(detetarIntencao('quero marcar uma massagem')).toBe('marcacao')
  })
  it('marcação tem prioridade sobre serviços', () => {
    expect(detetarIntencao('quero agendar um serviço')).toBe('marcacao')
  })
  it('desconhecida no fallback', () => {
    expect(detetarIntencao('xyz blah')).toBe('desconhecida')
  })
  it('ignora acentos/maiúsculas', () => {
    expect(detetarIntencao('PREÇO')).toBe('precos')
  })
})

describe('gerarRespostaAssistente', () => {
  it('serviços lista nomes', () => {
    expect(gerarRespostaAssistente('serviços', ctx)).toContain('Limpeza de Pele')
  })
  it('preços inclui valores', () => {
    expect(gerarRespostaAssistente('quanto custa', ctx)).toContain('€45.00')
  })
  it('marcação direciona para o portal e NUNCA marca', () => {
    const r = gerarRespostaAssistente('quero marcar', ctx)
    expect(r).toContain('marcar/aurora')
    expect(r.toLowerCase()).not.toContain('marcação confirmada')
  })
  it('morada usa o endereço do tenant', () => {
    expect(gerarRespostaAssistente('onde ficam', ctx)).toContain('Rua X, Lisboa')
  })
})
