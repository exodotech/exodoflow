# ExodoFlow AI — Setup & Governança (mapa para não te perderes)

> Documento-índice: onde está cada coisa, como correr, como commitar, e o estado
> das fases. Atualizado em 2026-06-12.

## 1. Estrutura do projeto (onde vive cada coisa)

```
exodoflowIA/                     ← pasta-mãe = REPOSITÓRIO GIT (raiz)
├── exodoflow/                   ← a APLICAÇÃO Next.js (onde corre npm)
│   ├── src/app/                 ← rotas, páginas e /api/*/route.ts
│   ├── src/components/          ← design-system, features, layout
│   ├── src/services/            ← acesso a dados/integração (whatsapp, bookings, ...)
│   ├── src/hooks/ src/lib/ src/types/
│   ├── commitlint.config.js     ← regras de Conventional Commits
│   └── package.json             ← scripts: dev, build, lint, test
├── supabase/migrations/         ← schema (migrações incrementais)
├── docs/                        ← documentação por fase (este ficheiro incluído)
├── eeos/                        ← kit de governança (adaptado ao ExodoFlow)
├── audit-exodoflow-full.mjs     ← AUDITOR (valida invariantes; 514 checks)
├── .githooks/commit-msg         ← git hook que valida Conventional Commits
└── .github/
    ├── pull_request_template.md  ← checklist Definition of Done
    └── workflows/ci.yml          ← CI (lint · test · build · auditor)
```

**Importante:** o `npm` corre dentro de `exodoflow/`. O git, o auditor, as migrações,
os docs e o eeos vivem na **raiz** (`exodoflowIA/`).

## 2. Como correr (verificação antes de dar algo por terminado)

```bash
cd exodoflow
npm run lint          # ESLint — tem de dar 0 erros
npm run build         # Next build (também faz type-check)
npm test              # Vitest
cd ..
node audit-exodoflow-full.mjs    # Auditor — tem de dar 0 problemas
```

Mudanças de schema (NUNCA `db reset`):
```bash
npx supabase migration up        # aplica migrações novas, incremental
```

## 3. Estado das fases WhatsApp (Meta Cloud API)

| Fase | O quê | Estado |
|---|---|---|
| 1A | Webhook inbound (assinatura HMAC) | ✅ |
| 1B | Resposta manual outbound (texto livre, janela 24h) | ✅ |
| **1C** | **Templates operacionais (confirmação/lembrete/cancelamento/reagendamento)** | ✅ |
| 1D | UI segura "Ligar WhatsApp" + aprovação de templates | ⏭️ próxima |

Detalhe da 1C: `docs/whatsapp-phase-1c-templates.md`. Cada tenant novo já nasce com
canais (inativos) + 5 templates mapeados (ver `src/services/comunicacao-seed.ts`).

## 4. Como fazer commits (Conventional Commits)

O git hook `.githooks/commit-msg` valida a mensagem ao commitar (corre o commitlint
de dentro de `exodoflow/`). Formato: `tipo(escopo): descrição`.

```bash
git commit -m "feat(whatsapp): envio manual de template 1C"
git commit -m "fix(agenda): esconder botão WhatsApp para staff"
git commit -m "docs(eeos): adaptar kit ao ExodoFlow"
```

- **Tipos:** feat, fix, docs, style, refactor, test, chore, perf, build, ci, revert
- **Escopos:** auth, tenant, agenda, clientes, servicos, recursos, whatsapp,
  onboarding, branding, equipa, admin, api, web, db, docs, deps, ci
- Mensagem inválida → o commit é **bloqueado** (regras em `exodoflow/commitlint.config.js`).

> Nota técnica: o hook está em `.githooks/` (git config `core.hooksPath=.githooks`),
> não no husky — porque o git está na raiz mas o commitlint vive em `exodoflow/`.
> Ao clonar de novo, correr uma vez: `git config core.hooksPath .githooks`.

## 5. Governança eeos (adaptada)

O `eeos/` é um kit de padrões de engenharia. Foi **adaptado** à realidade do ExodoFlow
(não usado cru, que descrevia Edge Functions/roles diferentes):
- `eeos/CLAUDE.md` — reescrito para a stack/estrutura/roles reais (referência).
- `exodoflow/.github/pull_request_template.md` — checklist Definition of Done (vivo).
- `exodoflow/commitlint.config.js` — Conventional Commits com escopos reais (vivo).
- Políticas completas (DoD, retenção, acessibilidade, performance, erros): `eeos/eeos/`.

> Os ficheiros de instrução **ativos** da raiz (`CLAUDE.md`/`AGENTS.md`) ficaram
> intactos — mantêm a regra crítica de ler `node_modules/next/dist/docs/` antes de
> codar. Promover o `eeos/CLAUDE.md` para a raiz é um passo opcional futuro.

## 6. ✅ Repositório git (resolvido — Opção A)

Decisão tomada (2026-06-12): **a pasta-mãe `exodoflowIA/` é o repositório git.**
Feito:
- `git init` na raiz `exodoflowIA/` (branch `main`); removido o `.git` acidental de `exodoflow/`.
- `.gitignore` na raiz cobre `node_modules/`, `.next/`, `.env`/`.env.local`, `*.tsbuildinfo`, etc.
- O `.github/workflows/ci.yml` na raiz fica correto (checkout da raiz, `working-directory: exodoflow`, auditor da raiz).
- Conventional Commits via `.githooks/commit-msg` (substitui o husky, que não encaixava com git-na-raiz + npm-na-subpasta). Husky desinstalado; commitlint mantido.

> **Ainda não foi feito nenhum commit** — o repo está inicializado e pronto. O primeiro
> commit/push é decisão tua (precisa de um remote no GitHub).

### Limpeza da raiz (feita — 2026-06-12)
Removidos os ficheiros órfãos do create-next-app na raiz (o app real está em `exodoflow/`):
`package.json`, `package-lock.json`, `next.config.ts`, `next-env.d.ts`, `postcss.config.mjs`,
`eslint.config.mjs`, `tsconfig.json`, `public/` (SVGs default), `src/` (database.ts stale),
`.next/` e `node_modules/` da raiz. **Mantidos** (reais): `tests/fixtures/` (exigidas pelo
auditor), `supabase/`, `eeos/`, `docs/`, `audit-exodoflow-full.mjs`, os `.md` e `.env.example`.
Validação após limpeza: lint 0 erros · build ✓ · auditor 514/0.

## 7. Notas

- Instalação do commitlint reportou **7 vulnerabilidades** (devDependencies, não vão para
  produção). NÃO correr `npm audit fix --force` (faz breaking changes). Rever com calma
  ao atualizar dependências.
