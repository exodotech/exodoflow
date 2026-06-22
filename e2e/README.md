# Testes E2E (Playwright)

Testes ponta-a-ponta que exercitam a app real no browser (login, navegação,
páginas públicas). Complementam os testes unitários (`npm test`, Vitest).

## Pré-requisitos
- App a correr: `npm run dev` (ou `npm run build && npm start`) em `http://localhost:3000`.
- BD de **dev semeada** (contas de teste do seed). **Nunca** apontar para produção.

## Correr
```bash
npm run test:e2e            # corre toda a suite (chromium)
npx playwright test --ui    # modo interativo
npx playwright show-report  # abre o último relatório HTML
```

Base URL configurável: `PLAYWRIGHT_BASE_URL=https://staging.exemplo.app npm run test:e2e`.

## Cobertura atual (`e2e/`)
- **auth.spec.ts** — marca no login, login válido/ inválido, registo desativado.
- **smoke.spec.ts** — rotas principais do dashboard carregam autenticadas e sem
  erros de página; módulo de finanças; página 404 com marca.

## Notas
- **Não** corre no job principal de CI (precisa do stack completo a correr). É uma
  rede de testes local / pré-release. Para CI dedicado, subir `supabase start` +
  build/serve a app e definir `PLAYWRIGHT_BASE_URL`.
- Contas e dados são **fictícios** (seed de dev). Não usar dados reais.
