import { test, expect } from '@playwright/test'

// Portal público da Clínica Aurora (slug do seed de DEV).
const SLUG = 'clinica-aurora'

test.describe('Portal Público de Marcação', () => {
  test('portal carrega para slug válido', async ({ page }) => {
    await page.goto(`/marcar/${SLUG}`, { waitUntil: 'networkidle' })

    // Não redirecionou para login nem para 404
    await expect(page).toHaveURL(new RegExp(`/marcar/${SLUG}`))

    // Mostra nome da empresa ou seleção de serviços
    await expect(
      page.getByText(/Aurora|serviço|marcação|escolha/i).first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('portal para slug inexistente mostra erro', async ({ page }) => {
    await page.goto('/marcar/empresa-que-nao-existe-xyz', { waitUntil: 'networkidle' })

    // Deve mostrar mensagem de indisponibilidade (não 404 do Next, mas mensagem da app)
    await expect(
      page.getByText(/indisponível|não encontrado|não existe|404/i).first()
    ).toBeVisible({ timeout: 8_000 })
  })

  test('portal não é indexado pelos motores de busca', async ({ page }) => {
    await page.goto(`/marcar/${SLUG}`)
    const robots = await page.evaluate(
      () => document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? ''
    )
    expect(robots.toLowerCase()).toMatch(/noindex/)
  })

  test('API de slots disponíveis responde (mesmo sem slots reais)', async ({ request }) => {
    const amanha = new Date()
    amanha.setDate(amanha.getDate() + 1)
    const data = amanha.toISOString().slice(0, 10)

    const resp = await request.get(
      `/api/public/${SLUG}/slots?date=${data}&service_id=00000000-0000-0000-0000-000000000000`
    )
    // 200 com lista vazia ou 400 com mensagem — não deve ser 500
    expect([200, 400]).toContain(resp.status())
  })

  test('API de info da empresa responde com dados do tenant', async ({ request }) => {
    const resp = await request.get(`/api/public/${SLUG}`)
    expect(resp.status()).toBe(200)
    const json = await resp.json()
    // Deve ter pelo menos o nome da empresa
    expect(json).toHaveProperty('name')
  })
})
