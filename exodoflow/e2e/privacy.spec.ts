import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Privacidade — exportação de dados do titular (RGPD)', () => {
  test('exporta os dados de um cliente em JSON válido', async ({ page }) => {
    await login(page, 'owner')
    await page.goto('/dashboard/clientes', { waitUntil: 'networkidle' })

    // Abrir o detalhe do primeiro cliente (botão com o nome)
    const botaoExportar = page.getByRole('button', { name: /Exportar \(RGPD\)/i })
    // Clica no primeiro cliente até o detalhe abrir
    await page.locator('button.hover\\:underline, table button').first().click().catch(() => {})
    await expect(botaoExportar).toBeVisible({ timeout: 10_000 })

    // a11y: o detalhe abre como diálogo acessível (role=dialog + aria-modal)
    await expect(page.getByRole('dialog')).toBeVisible()

    // Captura o download despoletado pelo botão
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      botaoExportar.click(),
    ])

    const nome = download.suggestedFilename()
    expect(nome).toMatch(/^dados-.*\.json$/)

    // Lê e valida o conteúdo
    const stream = await download.createReadStream()
    const chunks: Buffer[] = []
    for await (const c of stream) chunks.push(c as Buffer)
    const json = JSON.parse(Buffer.concat(chunks).toString('utf-8'))

    expect(json.meta?.standard).toContain('RGPD')
    expect(json).toHaveProperty('cliente')
    expect(json).toHaveProperty('marcacoes')
    expect(json).toHaveProperty('consentimentos')
  })
})
