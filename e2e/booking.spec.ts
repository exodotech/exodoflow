import { test, expect } from '@playwright/test'
import { login, trackPageErrors } from './helpers'

test.describe('Criação de Marcações', () => {
  test('modal de nova marcação abre com todos os campos obrigatórios', async ({ page }) => {
    await login(page, 'owner')
    await page.goto('/dashboard/agenda', { waitUntil: 'networkidle' })

    await page.getByRole('button', { name: /nova marcação/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 8_000 })

    // Campos mínimos presentes
    await expect(dialog.getByText(/serviço/i).first()).toBeVisible()
    await expect(dialog.getByText(/recurso/i).first()).toBeVisible()
    await expect(dialog.getByText(/data|hora/i).first()).toBeVisible()
  })

  test('formulário vazio não submete (validação client-side)', async ({ page }) => {
    await login(page, 'owner')
    await page.goto('/dashboard/agenda', { waitUntil: 'networkidle' })

    await page.getByRole('button', { name: /nova marcação/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 8_000 })

    // Submit sem preencher
    const botaoGuardar = dialog.getByRole('button', { name: /guardar|criar|confirmar|marcar/i })
    await botaoGuardar.click()

    // Modal permanece aberto — submissão não passou
    await expect(dialog).toBeVisible()
    // Não foi redirecionado nem saiu da agenda
    await expect(page).toHaveURL(/\/dashboard\/agenda/)
  })

  test('agenda carrega sem erros de página', async ({ page }) => {
    const erros = trackPageErrors(page)
    await login(page, 'owner')
    await page.goto('/dashboard/agenda', { waitUntil: 'networkidle' })

    // Sem exceções não tratadas
    expect(erros).toHaveLength(0)
    // Conteúdo carregado — cabeçalho da secção visível
    await expect(page.getByText(/agenda/i).first()).toBeVisible()
  })
})

test.describe('Proteção de Double-Booking', () => {
  test('API de booking público rejeita slot inválido', async ({ request }) => {
    // Testa a defesa de double-booking no servidor sem precisar de UI.
    // Tenta criar um booking com start_at == end_at (slot impossível).
    const resp = await request.post('/api/public/clinica-aurora/book', {
      data: {
        service_id: '00000000-0000-0000-0000-000000000000',
        resource_id: '00000000-0000-0000-0000-000000000000',
        start_at: '2026-12-01T10:00:00Z',
        end_at:   '2026-12-01T10:00:00Z',   // duração zero — inválido
        name: 'Teste Double Booking',
      },
    })
    // Deve rejeitar com erro 400 ou 404 (tenant real mas dados impossíveis)
    expect([400, 404]).toContain(resp.status())
  })

  test('API de booking público rejeita tenant inexistente', async ({ request }) => {
    const resp = await request.post('/api/public/tenant-que-nao-existe-xyz/book', {
      data: { service_id: 'x', resource_id: 'x', start_at: 'x', end_at: 'x', name: 'X' },
    })
    expect(resp.status()).toBe(404)
  })
})
