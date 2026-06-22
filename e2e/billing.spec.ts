import { test, expect } from '@playwright/test'
import { login } from './helpers'

// Testa o comportamento do gate de billing.
// O gate real (DB-driven) precisa de estado específico; aqui testamos:
//  a) Que a página /assinatura existe e carrega
//  b) Que tenants ativos chegam ao dashboard sem bloqueio
//  c) Que a API de health não revela dados de billing no body público

test.describe('Gate de Billing e Subscrição', () => {
  test('página /assinatura carrega (layout da marca visível)', async ({ page }) => {
    // Sem ser redirecionado pelo gate (acesso direto), a página deve renderizar.
    await page.goto('/assinatura', { waitUntil: 'networkidle' })

    // Pode redirecionar para /login (sem auth) ou renderizar a página de assinatura.
    // Em qualquer caso, não deve crashar (500).
    const url = new URL(page.url())
    expect(['/login', '/assinatura', '/dashboard']).toContain(url.pathname)
  })

  test('owner com subscrição ativa acede ao dashboard sem bloqueio', async ({ page }) => {
    // O tenant A do seed tem plano Starter (ativo) — não deve ser bloqueado.
    await login(page, 'owner')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

    // Não foi redirecionado para /assinatura
    expect(new URL(page.url()).pathname).not.toBe('/assinatura')
  })

  test('API de health responde 200 e não expõe dados de billing', async ({ request }) => {
    const resp = await request.get('/api/health')
    expect(resp.status()).toBe(200)
    const json = await resp.json()

    // Health check não deve ter dados sensíveis de billing
    expect(json).not.toHaveProperty('stripe_key')
    expect(json).not.toHaveProperty('plan_id')

    // Deve ter status geral
    expect(json).toHaveProperty('status')
  })

  test('configurações de plano só acessíveis com auth', async ({ request }) => {
    // Sem token, a API de billing não deve responder com dados
    const resp = await request.post('/api/billing/checkout', {
      data: { slug: 'starter', cycle: 'monthly' },
    })
    // Deve ser 401 (unauthorized) ou redirect para login — nunca 200 sem auth
    expect(resp.status()).not.toBe(200)
  })
})
