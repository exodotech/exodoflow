# Definition of Done

**Estado:** Ativo · **Owner:** Engineering · **Aplica-se a:** toda a tarefa que chega a produção
**Última revisão:** 2026-06

Uma tarefa só está **Done** quando *todos* os critérios aplicáveis abaixo estão cumpridos. "Funciona na minha máquina" não é um estado.

## 1. Código
- [ ] Implementa o critério de aceitação da issue (linkada no PR).
- [ ] Passa lint, formatter e type-check sem warnings novos.
- [ ] Sem `TODO`/`FIXME` sem issue associada.
- [ ] Commits seguem [Conventional Commits](./CONVENTIONAL_COMMITS.md).
- [ ] Sem secrets, credenciais ou dados reais de clientes no código ou testes.

## 2. Review
- [ ] ≥ **1 aprovação** de outro engenheiro (≥ 2 para mudanças em auth, billing, migrações destrutivas ou infraestrutura).
- [ ] Comentários resolvidos ou com issue de follow-up explícita.
- [ ] PR ≤ ~400 linhas de diff sempre que possível; PRs maiores justificam o porquê na descrição.

## 3. Testes
- [ ] Testes unitários para lógica nova; cobertura do diff ≥ **80%** (gate em CI).
- [ ] Teste de integração para todo o endpoint/consumer novo ou alterado.
- [ ] Caso de erro testado, não só o caminho feliz.
- [ ] Bug fix inclui teste de regressão que falhava antes do fix.
- [ ] Mudanças de UI passam checks de [acessibilidade](./ACCESSIBILITY_STANDARDS.md) (axe sem violações serious/critical).

## 4. Documentação
- [ ] OpenAPI/contratos atualizados se a API mudou.
- [ ] README/runbook do serviço atualizado se operação ou configuração mudou.
- [ ] Erros novos registados no [Error Catalog](./ERROR_CATALOG.md).
- [ ] Changelog/release notes quando visível ao cliente.

## 5. Logs
- [ ] Eventos relevantes logados de forma estruturada (JSON) com `trace_id`, `tenant_id` e código de erro do catálogo.
- [ ] **Sem PII em claro nos logs** (emails, tokens, conteúdo de prompts em texto livre).
- [ ] Níveis corretos: `error` é acionável; o que não exige ação não é `error`.

## 6. Monitorização
- [ ] Métricas para o caminho crítico novo (latência, taxa de erro, throughput).
- [ ] Alertas definidos quando a feature tem SLO associado, com ligação ao runbook.
- [ ] Dashboards atualizados se a feature muda o comportamento de um existente.

## 7. Rollback
- [ ] Estratégia de rollback declarada no PR: feature flag, revert de deploy, ou plano de reversão de migração ([Expand and Contract](./EXPAND_AND_CONTRACT.md)).
- [ ] Features com risco para o utilizador saem atrás de **feature flag** com rollout gradual (interno → 5% → 50% → 100%).
- [ ] Se o rollback é impossível, isso está escrito no PR e aprovado pelo tech lead.

## 8. Segurança e dados (quando aplicável)
- [ ] Input externo validado; queries parametrizadas.
- [ ] Autorização verificada ao nível do recurso (tenant isolation testada).
- [ ] Dados novos têm categoria de [retenção](./DATA_RETENTION_POLICY.md) definida.

---

**Enforcement:** o template de PR contém esta checklist; o reviewer é corresponsável pelo seu cumprimento. Saltar critérios "porque é urgente" exige aprovação escrita do tech lead e issue de dívida técnica com prazo.
