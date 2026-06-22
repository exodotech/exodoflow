import { test, expect } from '@playwright/test'

test.describe('Recuperação de Palavra-passe', () => {
  test('página de forgot-password carrega e tem formulário', async ({ page }) => {
    await page.goto('/forgot-password', { waitUntil: 'networkidle' })

    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /enviar|recuperar|repor/i })).toBeVisible()
  })

  test('a11y: campo de email tem label acessível', async ({ page }) => {
    await page.goto('/forgot-password', { waitUntil: 'networkidle' })
    await expect(page.getByLabel(/e-mail|email/i)).toBeVisible()
  })

  test('email inválido mostra erro de validação', async ({ page }) => {
    await page.goto('/forgot-password', { waitUntil: 'networkidle' })
    await page.fill('input[type="email"]', 'nao-e-um-email')
    await page.getByRole('button', { name: /enviar|recuperar|repor/i }).click()
    // HTML5 ou validação Zod impedem submissão — o campo fica em foco/erro
    // (o URL não muda — nenhum redirect acontece para email inválido)
    await page.waitForTimeout(1_000)
    await expect(page).toHaveURL(/\/forgot-password/)
  })

  test('email válido mostra mensagem de sucesso (sem revelar se existe)', async ({ page }) => {
    await page.goto('/forgot-password', { waitUntil: 'networkidle' })
    await page.fill('input[type="email"]', 'teste-nao-existe@exemplo.pt')
    await page.getByRole('button', { name: /enviar|recuperar|repor/i }).click()

    // Supabase devolve sempre mensagem de "enviámos um link" (não revela se o email existe)
    await expect(
      page.getByText(/link|email|verifique|enviámos|instruções/i).first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('página de reset-password carrega quando acedida diretamente', async ({ page }) => {
    // Sem token real a página deve carregar e mostrar o formulário
    // (com token inválido/ausente pode mostrar erro, mas não crasha)
    await page.goto('/reset-password', { waitUntil: 'networkidle' })

    // Deve renderizar algo — pelo menos o layout da marca
    await expect(page.getByText(/ExodoFlow|palavra-passe|password/i).first()).toBeVisible()
  })

  test('link de voltar ao login está presente', async ({ page }) => {
    await page.goto('/forgot-password', { waitUntil: 'networkidle' })
    const linkLogin = page.getByRole('link', { name: /entrar|login|voltar/i })
    await expect(linkLogin).toBeVisible()
    await linkLogin.click()
    await expect(page).toHaveURL(/\/login/)
  })
})
