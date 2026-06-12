import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { reportError, reportMessage } from './observability'

// O sink actual escreve em console.* — espiamos para confirmar o encaminhamento.
describe('observability', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('reportError normaliza um Error e regista a nível error', () => {
    reportError(new Error('falha X'), { scope: 'boundary:route', digest: 'abc123' })
    expect(console.error).toHaveBeenCalledOnce()
    const linha = (console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls[0].join(' ')
    expect(linha).toContain('falha X')
    expect(linha).toContain('boundary:route')
    expect(linha).toContain('abc123')
  })

  it('reportError lida com valores que não são Error', () => {
    reportError('string solta')
    expect(console.error).toHaveBeenCalledOnce()
    const linha = (console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls[0].join(' ')
    expect(linha).toContain('string solta')
  })

  it('reportMessage info/warn vai para o nível certo', () => {
    reportMessage('arranque', 'info')
    reportMessage('atenção', 'warn')
    expect(console.info).toHaveBeenCalledOnce()
    expect(console.warn).toHaveBeenCalledOnce()
  })
})
