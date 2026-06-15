import { type Page, expect } from '@playwright/test'

// Contas do seed de DEV (fictícias). NÃO são dados reais.
export const CONTAS = {
  owner: { email: 'owner@clinica-aurora.pt', password: 'test1234' },
  admin: { email: 'admin@exodoflow.pt',      password: 'admin12345' },
} as const

// Faz login e espera sair de /login. Devolve o pathname de destino.
export async function login(page: Page, perfil: keyof typeof CONTAS = 'owner'): Promise<string> {
  const { email, password } = CONTAS[perfil]
  await page.goto('/login', { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 })
  return new URL(page.url()).pathname
}

// Recolhe erros de página (exceções não tratadas) para asserções de "sem erros".
export function trackPageErrors(page: Page): string[] {
  const erros: string[] = []
  page.on('pageerror', (e) => erros.push(e.message))
  return erros
}

export { expect }
