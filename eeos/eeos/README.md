# Engineering Operating System (EEOS)

**Owner:** CTO · **Última revisão:** 2026-06 · **Ciclo de revisão:** semestral (ou via RFC a qualquer momento)

Este é o sistema operativo de engenharia da empresa: o conjunto de políticas que tornam as decisões previsíveis sem reuniões. Cada documento tem owner, regras com valores concretos e mecanismo de enforcement — uma política sem enforcement é uma sugestão.

## Documentos

| Documento | Resume-se a | Enforcement |
|---|---|---|
| [Conventional Commits](./CONVENTIONAL_COMMITS.md) | Formato de commits e versionamento automático | commitlint em CI |
| [API Versioning Policy](./API_VERSIONING_POLICY.md) | O que é breaking, ciclo de vida de versões, deprecação 12 meses | contract diff em CI |
| [RFC Process](./RFC_PROCESS.md) | Quando e como propor grandes mudanças; ADRs | gate de aprovação |
| [Expand and Contract](./EXPAND_AND_CONTRACT.md) | Migrações de schema sem downtime em 4 fases | review obrigatória |
| [Data Retention Policy](./DATA_RETENTION_POLICY.md) | Prazos por categoria de dados, RGPD, RPO 1h / RTO 4h | TTLs + auditoria semestral |
| [Security Headers](./SECURITY_HEADERS.md) | CSP com nonces, HSTS preload, headers exatos | middleware único + teste em CI |
| [Accessibility Standards](./ACCESSIBILITY_STANDARDS.md) | WCAG 2.2 AA obrigatório (European Accessibility Act) | axe em CI + auditoria anual |
| [Definition of Done](./DEFINITION_OF_DONE.md) | 8 critérios para "done": código, review, testes, docs, logs, monitorização, rollback, segurança | template de PR |
| [Dependency Update Policy](./DEPENDENCY_UPDATE_POLICY.md) | SLAs por severidade CVSS (crítica 24h), regras de supply chain | SCA em CI + Renovate |
| [Performance Standards](./PERFORMANCE_STANDARDS.md) | Web vitals p75, budgets de bundle, SLOs de API, error budget | budgets em CI + RUM |
| [Error Catalog](./ERROR_CATALOG.md) | Códigos imutáveis, formato RFC 9457, tabela por domínio | pacote partilhado + lint |

## Como alterar uma política

Alterações a qualquer documento do EEOS seguem o [RFC Process](./RFC_PROCESS.md). Pequenas correções (typos, clarificações sem mudança de regra) podem ir por PR direto com aprovação do owner do documento.

## Gaps conhecidos (próximos documentos a criar)

1. **Incident Response** — severidades, on-call, postmortems blameless. *(prioridade alta)*
2. **Secrets Management** — onde vivem, rotação, acesso. *(prioridade alta)*
3. **Branching & Release Strategy** — trunk-based, feature flags, cadência.
4. **Code Review Guidelines** — o que o reviewer procura, tempos de resposta.
5. **Observability Standards** — o que é obrigatório logar/medir por serviço.
6. **Onboarding de Engenharia** — primeiro commit em produção na semana 1.
