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

  test('logout termina a sessão e redireciona para /login', async ({ page }) => {
    await login(page, 'owner')
    await page.goto('/dashboard/perfil', { waitUntil: 'networkidle' })

    // Clicar no botão de logout (pode estar em dropdown ou direto)
    const botaoLogout = page.getByRole('button', { name: /sair|logout/i })
    await expect(botaoLogout).toBeVisible({ timeout: 8_000 })
    await botaoLogout.click()

    // Após logout termina em /login
    await page.waitForURL(/\/login/, { timeout: 15_000 })
    await expect(page).toHaveURL(/\/login/)

    // Tentar aceder ao dashboard sem sessão redireciona de volta ao login
    await page.goto('/dashboard', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/login/)
  })

  test('visitante não autenticado é redirecionado ao tentar aceder ao dashboard', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/login/)
  })
})
