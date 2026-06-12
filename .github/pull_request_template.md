## O que muda

<!-- Resumo da mudança e link da issue. Ex.: Closes #123 -->

## Porquê

<!-- Contexto/motivação. Se há fase/RFC, referenciar (ex.: WhatsApp Fase 1C) -->

## Como testar

<!-- Passos concretos para o reviewer validar -->

## Estratégia de rollback

<!-- Feature flag? Revert? Reversão de migração (incremental)? Se impossível, dizer e justificar. -->

---

## Definition of Done (ver eeos/eeos/DEFINITION_OF_DONE.md)

- [ ] `npm run lint`, `npm run build` (type-check), `npm test` (de exodoflow/) e `node audit-exodoflow-full.mjs` (da raiz) a passar
- [ ] Testes para a lógica nova (caso de erro incluído, não só o caminho feliz)
- [ ] Isolamento de tenant respeitado/testado (se toca dados de cliente); `tenant_id` vem da sessão
- [ ] Sem secrets/tokens no frontend, sem PII em logs, sem `any` por justificar
- [ ] Migrações incrementais e não-destrutivas (sem `db reset`, sem `DROP`/`RENAME` que perca dados); RLS na mesma migração
- [ ] Permissões verificadas no servidor **e** refletidas na UI (RBAC)
- [ ] Documentação (`docs/`) e auditor atualizados; nova fase adiciona checks ao auditor
- [ ] Mudanças de UI: mobile-first + acessibilidade (axe sem violações serious/critical)
- [ ] Commits seguem Conventional Commits
