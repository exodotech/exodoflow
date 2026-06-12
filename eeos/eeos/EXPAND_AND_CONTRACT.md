# Expand and Contract (Migrações sem downtime)

**Estado:** Ativo · **Owner:** Engineering · **Aplica-se a:** todas as alterações de schema em produção
**Última revisão:** 2026-06

## Princípio

Schema e código fazem deploy em momentos diferentes. Logo, **toda a migração tem de ser compatível com a versão de código anterior e seguinte**. Nunca se remove ou renomeia nada no mesmo deploy que deixa de o usar.

## Operações proibidas em passo único

| Operação | Porquê | Alternativa |
|---|---|---|
| `DROP COLUMN` / `DROP TABLE` | Código antigo ainda lê | Contract em release N+2 |
| `RENAME COLUMN` | Quebra ambas as versões | Expand → dual-write → contract |
| Alterar tipo de coluna in-place | Lock + incompatibilidade | Nova coluna + backfill |
| `NOT NULL` em coluna existente | Falha em writes antigos | Default + backfill + constraint `NOT VALID` → `VALIDATE` |
| Índice sem `CONCURRENTLY` (Postgres) | Lock de escrita na tabela | `CREATE INDEX CONCURRENTLY` |

## O ciclo completo

### Fase 1 — Expand (release N)
1. Adicionar a nova coluna/tabela, **nullable e sem constraints bloqueantes**.
2. Deploy de código com **dual-write**: escreve no antigo e no novo; **lê do antigo**.

### Fase 2 — Migrate (entre releases)
3. **Backfill** dos dados históricos em batches (≤ 5.000 linhas por batch, pausa entre batches, monitorizar replication lag). Backfill é um job idempotente e retomável, nunca um `UPDATE` único sobre a tabela inteira.
4. **Validar paridade**: job de comparação antigo vs. novo; divergência = bloqueio da fase seguinte.

### Fase 3 — Switch (release N+1)
5. Código passa a **ler do novo** (atrás de feature flag para rollback instantâneo).
6. Manter dual-write durante ≥ 1 ciclo de release como rede de segurança.

### Fase 4 — Contract (release N+2)
7. Remover dual-write; código só usa o novo.
8. Após período de observação (mínimo **1 semana sem leituras do campo antigo**, confirmado por métricas/logs), `DROP` da coluna antiga em migração própria.

## Regras operacionais

- Migrações vivem no repositório, são revistas como código e correm automaticamente no pipeline de deploy (nunca à mão em produção).
- Toda a migração declara o seu **plano de rollback**. Se o rollback é impossível (ex.: drop), isso é dito explicitamente no PR e exige aprovação de tech lead.
- Migrações destrutivas (qualquer `DROP`) exigem: confirmação de backup recente + zero leituras nas últimas 7 dias + aprovação de tech lead.
- Limite de duração: migração que segure lock > 5 segundos em tabela com tráfego tem de ser redesenhada.
- Cada migração = um PR pequeno e isolado. Não misturar migração com mudanças de aplicação no mesmo PR quando evitável.
