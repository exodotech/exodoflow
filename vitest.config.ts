import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Testes de lógica pura (node). Resolve o alias @/ para src/.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
