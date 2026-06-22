import { defineConfig, devices } from '@playwright/test'

// Configuração dos testes E2E (Playwright). Assume a app a correr em
// PLAYWRIGHT_BASE_URL (por omissão http://localhost:3000) com a BD de DEV
// semeada (contas de teste do seed). Correr: `npm run test:e2e`.
//
// NÃO corre no job principal de CI (precisa do stack completo a correr); é uma
// rede de testes para validação local / pré-release.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    locale: 'pt-PT',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
