## O que muda

<!-- Resumo da mudança e link da issue. Ex.: Closes #123 -->

## Porquê

<!-- Contexto/motivação. Se há RFC, referenciar: RFC-NNN -->

## Como testar

<!-- Passos concretos para o reviewer validar -->

## Estratégia de rollback

<!-- Feature flag? Revert de deploy? Reversão de migração? Se impossível, dizer e justificar. -->

---

## Definition of Done (ver docs/eeos/DEFINITION_OF_DONE.md)

- [ ] Lint, type-check, testes e build a passar
- [ ] Testes para a lógica nova (cobertura do diff ≥ 80%, caso de erro incluído)
- [ ] Isolamento de tenant testado (se toca dados de cliente)
- [ ] Sem secrets, PII em logs, ou `any` sem justificação
- [ ] Erros novos adicionados ao Error Catalog
- [ ] Migrações seguem expand-and-contract (sem DROP/RENAME em passo único)
- [ ] Documentação/contratos atualizados
- [ ] Acessibilidade verificada (mudanças de UI: axe sem violações serious/critical)
- [ ] Commits seguem Conventional Commits
