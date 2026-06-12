# Conventional Commits

**Estado:** Ativo · **Owner:** Engineering · **Enforcement:** CI (commitlint) — obrigatório
**Última revisão:** 2026-06

## Objetivo

Histórico legível, changelogs automáticos e versionamento semântico derivado dos commits (semantic-release).

## Formato

```
<tipo>(<escopo>): <descrição no imperativo, minúsculas, sem ponto final>

[corpo opcional — o "porquê", não o "como"]

[rodapé opcional — BREAKING CHANGE, refs de issues]
```

- Linha de assunto: máx. **72 caracteres**.
- Descrição no imperativo: "adiciona", não "adicionado" nem "adicionando".
- Corpo separado do assunto por linha em branco.

## Tipos permitidos

| Tipo | Uso | Afeta versão (SemVer) |
|---|---|---|
| `feat` | Nova funcionalidade visível ao utilizador/API | MINOR |
| `fix` | Correção de bug | PATCH |
| `perf` | Melhoria de performance sem mudar comportamento | PATCH |
| `refactor` | Alteração de código sem mudar comportamento | — |
| `docs` | Apenas documentação | — |
| `style` | Formatação, lint, sem mudança lógica | — |
| `test` | Adição/correção de testes | — |
| `build` | Sistema de build, dependências | — |
| `ci` | Pipelines, workflows | — |
| `chore` | Manutenção que não encaixa acima | — |

## Escopos válidos

`auth`, `billing`, `ai`, `tenant`, `api`, `web`, `infra`, `db`, `docs`. Novos escopos exigem PR a este documento.

## Breaking changes

Indicar com `!` após o tipo/escopo **e** rodapé `BREAKING CHANGE:`:

```
feat(api)!: remove campo legacy_id da resposta de /users

BREAKING CHANGE: clientes devem migrar para o campo id.
Ver guia de migração em docs/migrations/2026-06-users-id.md
Refs: RFC-014
```

Breaking changes em API pública exigem cumprimento da [API Versioning Policy](./API_VERSIONING_POLICY.md).

## Exemplos

```
feat(auth): adiciona MFA via TOTP
fix(billing): corrige idempotência no webhook de pagamento (BILLING_002)
perf(ai): cache de embeddings reduz latência p95 em 40%
chore(deps): atualiza fastify 4.26 → 4.27
```

## Enforcement

1. **Local:** hook `commit-msg` via husky + commitlint (config partilhada `@empresa/commitlint-config`).
2. **CI:** job `lint-commits` valida todos os commits do PR. PR não passa sem commits válidos.
3. **Merge:** estratégia *squash merge*; o título do PR deve seguir o mesmo formato, pois torna-se o commit final.

## Regras adicionais

- Um commit = uma mudança lógica. Não misturar `feat` com `refactor` no mesmo commit.
- Referenciar issues no rodapé: `Refs: #123` ou `Closes: #123`.
- Commits de revert: `revert: <assunto do commit revertido>` com `Reverts: <hash>` no rodapé.
