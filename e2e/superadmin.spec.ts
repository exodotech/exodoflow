import { test, expect } from '@playwright/test'
import { login, trackPageErrors } from './helpers'

// Verifica que o superadmin:
//  a) Acede ao /admin após login
//  b) NÃO vê dados operacionais de tenants no /admin
//  c) NÃO consegue aceder a /dashboard (área de tenant)

test.describe('Isolamento do Superadmin', () => {
  test('superadmin é redirecionado para /admin após login', async ({ page }) => {
    const dest = await login(page, 'admin')
    expect(dest).toMatch(/^\/admin/)
    await expect(page).toHaveURL(/\/admin/)
  })

  test('painel /admin carrega sem erros de página', async ({ page }) => {
    const erros = trackPageErrors(page)
    await login(page, 'admin')
    await page.goto('/admin', { waitUntil: 'networkidle' })
    expect(erros).toHaveLength(0)
    // Tem conteúdo do painel de admin
    await expect(page.getByText(/admin|empresas|sistema/i).first()).toBeVisible()
  })

  test('superadmin vê lista de empresas mas NÃO dados de tenant', async ({ page }) => {
    await login(page, 'admin')
    await page.goto('/admin/empresas', { waitUntil: 'networkidle' })

    // A lista de empresas é visível (gestão de tenants)
    await expect(page.getByText(/empresas|tenants/i).first()).toBeVisible({ timeout: 8_000 })

    // Mas não mostra dados operacionais (clientes, marcações) dos tenants
    await expect(page.getByText(/nova marcação/i)).toHaveCount(0)
    await expect(page.getByText(/lista de clientes/i)).toHaveCount(0)
  })

  test('superadmin não consegue aceder ao /dashboard de tenant', async ({ page }) => {
    await login(page, 'admin')
    // Tenta aceder à área operacional de tenant
    await page.goto('/dashboard', { waitUntil: 'networkidle' })

    // Deve ser redirecionado — nunca ficar em /dashboard
    await page.waitForTimeout(2_000)
    const pathname = new URL(page.url()).pathname
    expect(pathname).not.toMatch(/^\/dashboard/)
  })

  test('superadmin não consegue aceder a dados de agenda via URL direta', async ({ page }) => {
    await login(page, 'admin')
    await page.goto('/dashboard/agenda', { waitUntil: 'networkidle' })

    // Não deve renderizar a agenda de nenhum tenant
    const pathname = new URL(page.url()).pathname
    expect(pathname).not.toBe('/dashboard/agenda')
  })

  test('API de admin rejeita pedidos sem role superadmin', async ({ request }) => {
    // Sem auth nenhuma, a API de admin deve bloquear
    const resp = await request.get('/api/admin/empresas')
    expect([401, 403, 404, 307, 308]).toContain(resp.status())
  })
})
