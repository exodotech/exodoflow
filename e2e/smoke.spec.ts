import { test, expect } from '@playwright/test'
import { login, trackPageErrors } from './helpers'

// Smoke das páginas principais do dashboard: carregam sem exceções de página.
const ROTAS = [
  '/dashboard',
  '/dashboard/agenda',
  '/dashboard/clientes',
  '/dashboard/servicos',
  '/dashboard/recursos',
  '/dashboard/financas',
  '/dashboard/configuracoes',
]

test.describe('Smoke do dashboard (owner)', () => {
  test('todas as rotas principais carregam sem erros de página', async ({ page }) => {
    const erros = trackPageErrors(page)
    await login(page, 'owner')

    for (const rota of ROTAS) {
      await page.goto(rota, { waitUntil: 'networkidle' })
      // A app não ficou no boundary de erro
      await expect(page.getByText('Algo correu mal')).toHaveCount(0)
      // Continua autenticada (não foi atirada para /login)
      expect(new URL(page.url()).pathname, `Redirecionado para login em ${rota}`).toBe(rota)
      // A navegação lateral está renderizada — não é página em branco
      await expect(page.getByRole('link', { name: 'Agenda' })).toBeVisible()
    }

    expect(erros, `Erros de página: ${erros.join(' | ')}`).toHaveLength(0)
  })

  test('finanças mostra o módulo de caixa', async ({ page }) => {
    await login(page, 'owner')
    await page.goto('/dashboard/financas', { waitUntil: 'networkidle' })
    await expect(page.getByText(/Finanças/i).first()).toBeVisible()
  })
})

test.describe('Páginas públicas', () => {
  test('404 com marca em rota inexistente', async ({ page }) => {
    await page.goto('/rota-que-nao-existe-xyz')
    await expect(page.getByText('404')).toBeVisible()
    await expect(page.getByText(/não encontrada/i)).toBeVisible()
  })
})
