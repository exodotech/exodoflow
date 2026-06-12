# ExodoFlow AI — Performance Review (básico)

> Revisão das queries de leitura mais usadas. Objetivo: detetar limites em falta,
> selects pesados, N+1 e gargalos a ~10k registos. **Sem otimizações grandes** —
> só correções óbvias.

## Resumo

| Query | Limite | Select | N+1 | Índice | 10k registos | Estado |
|---|---|---|---|---|---|---|
| `listarBookings` | ✅ 500 | join client/service/resources | Não (1 query c/ embeds) | `tenant_id`, `start_at` | ⚠️ paginar por período | OK |
| `listarBookingsPorData` | ✅ 500 | embeds | Não | `start_at` | ✅ filtra intervalo | OK |
| `listarBookingsPorCliente` | ✅ 50 | service | Não | `client_id` | ✅ | OK |
| `listarClientes` | ✅ 1000 | colunas específicas | Não | `tenant_id` | ⚠️ busca server-side futura | OK |
| `listarRecursos` | ✅ 500 *(corrigido)* | `*` | Não | `tenant_id` | ✅ poucos por tenant | OK |
| `listarServicos` | ✅ 500 *(corrigido)* | `*` | Não | `tenant_id` | ✅ poucos por tenant | OK |
| `listarAuditoria` (audit_logs) | ✅ 200 | colunas específicas | Não | `tenant_id`, `created_at` | ✅ | OK |
| `listarSystemAudit` | ✅ 100 | colunas específicas | Não | `created_at DESC` | ✅ | OK |
| `admin_list_tenants` (RPC) | ❌ sem LIMIT | owner join + 3 `count(*)` por tenant | Subqueries por linha | `tenant_id` nas contagens | ⚠️ **ver abaixo** | A melhorar (scale) |
| `/api/health` | n/a | `select id limit 1` | Não | — | ✅ trivial | OK |

## Correções óbvias aplicadas nesta fase

- **`listarRecursos`** e **`listarServicos`**: adicionado `.limit(500)`. Antes não
  tinham limite — recursos/serviços por tenant são poucos, mas o limite protege
  contra payloads anómalos (defesa em profundidade).

## Observações e recomendações (NÃO implementar agora)

1. **`admin_list_tenants` não tem LIMIT** e faz 3 subconsultas de contagem por
   tenant (`profiles`, `clients`, `bookings`). Com poucas dezenas de tenants é
   instantâneo; a **~10k tenants** ficará lento. Recomendado quando escalar:
   adicionar **paginação** (LIMIT/OFFSET ou keyset) e/ou **contagens materializadas**
   (tabela de métricas atualizada por trigger) em vez de subqueries por linha.
   Só o superadmin chama esta RPC, logo o risco operacional imediato é baixo.

2. **`listarBookings` (limit 500)** carrega todas as marcações do tenant. Para
   agendas grandes, migrar para **busca por período** (a agenda já tem
   `listarBookingsPorData`) e remover a lista global, ou paginar.

3. **`listarClientes` (limit 1000)** — quando um tenant passar de ~1000 clientes,
   introduzir **busca server-side** (filtro por nome/telefone na query, não no cliente).

4. **Índices:** 53 índices definidos, cobrindo `tenant_id`, `client_id`, `start_at`,
   `created_at DESC` nas tabelas quentes. Cobertura adequada para o estágio atual.
   Antes de produção, validar com `EXPLAIN ANALYZE` as queries da agenda com dados realistas.

5. **N+1:** não há N+1 ao nível da aplicação (as listas usam embeds do PostgREST
   numa só query). As subqueries do `admin_list_tenants` correm dentro de **uma**
   query SQL (não são round-trips), mas escalam por nº de tenants (ponto 1).

## Veredito

Para o estágio atual (pré-clientes, poucos tenants e registos), o desempenho é
**adequado**. Os únicos pontos a vigiar para escala são `admin_list_tenants`
(paginação) e as listas globais de bookings/clientes (busca server-side). Nenhum
é bloqueador agora.
