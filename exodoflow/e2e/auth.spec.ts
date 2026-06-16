import { test, expect } from '@playwright/test'
import { login, CONTAS } from './helpers'

test.describe('Autenticação', () => {
  test('a página de login mostra a marca e os campos', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText(/ExodoFlow/i).first()).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('a11y: campos do login têm label acessível associado', async ({ page }) => {
    await page.goto('/login')
    // getByLabel só encontra o input se a label estiver associada (htmlFor/id ou aria).
    // exact:true para não colidir com o botão "Mostrar palavra-passe".
    await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Palavra-passe', { exact: true })).toBeVisible()
  })

  test('login válido entra no dashboard', async ({ page }) => {
    const dest = await login(page, 'owner')
    expect(dest.startsWith('/dashboard')).toBeTruthy()
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('credenciais inválidas não entram', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })
    await page.fill('input[type="email"]', CONTAS.owner.email)
    await page.fill('input[type="password"]', 'password-errada-123')
    await page.click('button[type="submit"]')
    // Continua em /login (não redireciona)
    await page.waitForTimeout(2500)
    await expect(page).toHaveURL(/\/login/)
  })

  test('registo público está desativado (acesso por convite)', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByText(/convite/i).first()).toBeVisible()
    // Não há campo de password (sem formulário de signup)
    await expect(page.locator('input[type="password"]')).toHaveCount(0)
  })
})
