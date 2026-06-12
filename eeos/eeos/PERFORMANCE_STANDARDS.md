# Performance Standards

**Estado:** Ativo · **Owner:** Platform + Frontend Guild
**Medição:** RUM (dados reais de utilizadores) para web vitals; APM para backend. Lab data (Lighthouse) só como gate de CI.
**Última revisão:** 2026-06

## Frontend — Core Web Vitals (percentil 75, dados reais)

| Métrica | Alvo (p75) | Limite de alerta |
|---|---|---|
| **LCP** (Largest Contentful Paint) | ≤ **2.5 s** | > 3.0 s |
| **INP** (Interaction to Next Paint) | ≤ **200 ms** | > 350 ms |
| **CLS** (Cumulative Layout Shift) | ≤ **0.1** | > 0.15 |
| **TTFB** | ≤ **600 ms** | > 800 ms |

## Frontend — Budgets de build (gates em CI)

| Recurso | Budget | Gate |
|---|---|---|
| JS inicial (gzip) por rota | ≤ **250 KB** | Build falha |
| CSS inicial (gzip) | ≤ **60 KB** | Build falha |
| Imagem individual | ≤ 200 KB (formatos modernos: AVIF/WebP) | Build falha |
| Lighthouse Performance (CI, mobile throttled) | ≥ **85** | Build falha |

Aumentar um budget exige PR a este documento com justificação — o budget não se ajusta silenciosamente ao bundle.

## Backend — API

| Métrica | Alvo | Alerta |
|---|---|---|
| Latência p95 (endpoints de leitura) | ≤ **300 ms** | > 500 ms |
| Latência p95 (endpoints de escrita) | ≤ **600 ms** | > 1 s |
| Latência p99 (qualquer endpoint) | ≤ **1.5 s** | > 2.5 s |
| Taxa de erro 5xx | < **0.1%** | > 0.5% |
| Disponibilidade (mensal) | ≥ **99.9%** | Error budget esgotado |

Endpoints de IA (inferência) têm SLO próprio: **time-to-first-token p95 ≤ 1.5 s** em streaming; total p95 documentado por feature.

## Base de dados

- Query em caminho de request: alvo **p95 ≤ 50 ms**; query > 200 ms entra no slow query log e gera issue.
- Proibido N+1 detetável: APM com deteção ativa; ocorrências em código novo bloqueiam o PR.
- Todo o acesso por padrão novo de query exige `EXPLAIN ANALYZE` no PR quando toca tabelas > 1M linhas.
- Paginação obrigatória em toda a listagem (cursor-based em APIs públicas); sem `SELECT` sem `LIMIT` em código de aplicação.

## Processo

1. **Dashboards por serviço** com as métricas acima; revisão nas reuniões de engenharia mensais.
2. **Regressões:** degradação > 20% numa métrica p95 após deploy = rollback ou fix imediato (decidir em 30 min).
3. **Error budget:** quando o budget mensal de disponibilidade esgota, trabalho de fiabilidade tem prioridade sobre features até recuperar.
4. **Testes de carga** antes de mudanças com impacto de capacidade (novos endpoints de alto tráfego, migrações de infraestrutura), com perfil baseado em tráfego real + 50%.
