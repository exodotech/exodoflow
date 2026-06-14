import { describe, it, expect } from 'vitest'
import {
  fazAnosNoMes, diaAniversario, agregarStatsPorCliente, clienteInativo,
  gerarCSVClientes, todasAsTags, parseTags, type ClienteBase,
} from './insights'

describe('aniversários', () => {
  it('deteta aniversário no mês certo (ignora o ano)', () => {
    expect(fazAnosNoMes('1990-06-15', 6)).toBe(true)
    expect(fazAnosNoMes('1990-06-15', 7)).toBe(false)
  })
  it('lida com data ausente', () => {
    expect(fazAnosNoMes(null, 6)).toBe(false)
    expect(fazAnosNoMes(undefined, 6)).toBe(false)
  })
  it('extrai o dia do aniversário', () => {
    expect(diaAniversario('1990-06-15')).toBe(15)
  })
})

describe('agregação de marcações', () => {
  const agora = '2026-06-14T12:00:00.000Z'
  const bookings = [
    { client_id: 'a', start_at: '2026-01-10T10:00:00.000Z', status: 'completed' },
    { client_id: 'a', start_at: '2026-06-01T10:00:00.000Z', status: 'completed' },
    { client_id: 'a', start_at: '2026-07-01T10:00:00.000Z', status: 'confirmed' }, // futura
    { client_id: 'b', start_at: '2026-06-02T10:00:00.000Z', status: 'cancelled' }, // ignorada
    { client_id: null, start_at: '2026-06-02T10:00:00.000Z', status: 'completed' }, // sem cliente
  ]
  it('conta marcações não-canceladas e ignora as canceladas', () => {
    const m = agregarStatsPorCliente(bookings, agora)
    expect(m.get('a')?.total).toBe(3)
    expect(m.get('b')).toBeUndefined()
  })
  it('última visita = marcação passada mais recente (não conta futuras)', () => {
    const m = agregarStatsPorCliente(bookings, agora)
    expect(m.get('a')?.ultimaVisita).toBe('2026-06-01T10:00:00.000Z')
  })
})

describe('clientes inativos', () => {
  const agora = '2026-06-14T12:00:00.000Z'
  it('inativo se última visita > 3 meses', () => {
    expect(clienteInativo({ total: 2, ultimaVisita: '2026-01-01T10:00:00.000Z' }, agora, 3)).toBe(true)
  })
  it('ativo se veio recentemente', () => {
    expect(clienteInativo({ total: 2, ultimaVisita: '2026-06-01T10:00:00.000Z' }, agora, 3)).toBe(false)
  })
  it('quem nunca veio não é inativo (é lead novo)', () => {
    expect(clienteInativo({ total: 0, ultimaVisita: null }, agora, 3)).toBe(false)
    expect(clienteInativo(undefined, agora, 3)).toBe(false)
  })
})

describe('tags', () => {
  const clientes: ClienteBase[] = [
    { id: '1', full_name: 'A', tags: ['vip', 'frequente'], created_at: '2026-01-01' },
    { id: '2', full_name: 'B', tags: ['vip'], created_at: '2026-01-01' },
    { id: '3', full_name: 'C', tags: null, created_at: '2026-01-01' },
  ]
  it('junta tags distintas ordenadas', () => {
    expect(todasAsTags(clientes)).toEqual(['frequente', 'vip'])
  })
  it('parseTags limpa e separa', () => {
    expect(parseTags(' vip ,  frequente ,, ')).toEqual(['vip', 'frequente'])
  })
})

describe('exportação CSV', () => {
  it('gera cabeçalho + linhas com escape', () => {
    const clientes: ClienteBase[] = [
      { id: '1', full_name: 'Maria; Silva', phone: '912', email: 'm@e.pt', tags: ['vip'], is_guest: false, created_at: '2026-01-01' },
    ]
    const stats = new Map([['1', { total: 3, ultimaVisita: '2026-06-01T10:00:00.000Z' }]])
    const csv = gerarCSVClientes(clientes, stats, 'pt-PT')
    expect(csv.split('\n')[0]).toContain('Nome;Telefone')
    expect(csv).toContain('"Maria; Silva"') // escape do ';'
    expect(csv).toContain('vip')
    expect(csv).toContain('3')
  })
})
