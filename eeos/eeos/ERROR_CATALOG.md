# Error Catalog

**Estado:** Ativo · **Owner:** API Guild
**Regra:** todo o erro devolvido pela API ou logado usa um código deste catálogo. Códigos são **imutáveis** — nunca se reutiliza nem se muda a semântica de um código existente; deprecia-se e cria-se novo.
**Última revisão:** 2026-06

## Formato de resposta de erro (RFC 9457 — Problem Details)

```json
{
  "type": "https://docs.empresa.com/errors/AUTH_001",
  "title": "Credenciais inválidas",
  "status": 401,
  "code": "AUTH_001",
  "detail": "Email ou password incorretos.",
  "trace_id": "a1b2c3d4",
  "retryable": false
}
```

Regras:
- `detail` nunca revela informação sensível (não distinguir "email não existe" de "password errada"; não expor stack traces).
- Todo o erro 5xx é logado com `trace_id`; o cliente recebe o mesmo `trace_id` para suporte.
- Cada código tem página própria em `docs.empresa.com/errors/{CODE}` com causa e resolução.

## Domínio AUTH

| Código | HTTP | Título | Causa | Retryable | Ação do cliente |
|---|---|---|---|---|---|
| AUTH_001 | 401 | Credenciais inválidas | Login falhado | Não | Verificar credenciais; após 5 falhas → lockout temporário |
| AUTH_002 | 401 | Token expirado | Access token fora de validade | Sim | Renovar via refresh token |
| AUTH_003 | 401 | Token inválido | Assinatura/formato inválido | Não | Reautenticar |
| AUTH_004 | 403 | Permissão insuficiente | Role sem acesso ao recurso | Não | Pedir acesso ao admin do tenant |
| AUTH_005 | 403 | MFA obrigatório | Política do tenant exige MFA | Não | Completar desafio MFA |
| AUTH_006 | 429 | Demasiadas tentativas | Rate limit de autenticação | Sim (após `Retry-After`) | Aguardar |

## Domínio BILLING

| Código | HTTP | Título | Causa | Retryable | Ação do cliente |
|---|---|---|---|---|---|
| BILLING_001 | 402 | Pagamento recusado | Cartão recusado pelo emissor | Não | Atualizar método de pagamento |
| BILLING_002 | 409 | Webhook duplicado | Evento já processado (idempotência) | Não | Nenhuma — resposta segura, ignorar |
| BILLING_003 | 403 | Subscrição suspensa | Falta de pagamento | Não | Regularizar pagamento |
| BILLING_004 | 422 | Plano incompatível | Downgrade com utilização acima do limite do plano destino | Não | Reduzir utilização ou escolher outro plano |

## Domínio AI

| Código | HTTP | Título | Causa | Retryable | Ação do cliente |
|---|---|---|---|---|---|
| AI_001 | 429 | Quota de IA excedida | Limite do plano atingido | Sim (próximo ciclo) | Upgrade ou aguardar reset |
| AI_002 | 503 | Fornecedor de IA indisponível | Upstream em falha; circuito aberto | Sim (backoff exponencial) | Repetir; degradação anunciada na status page |
| AI_003 | 422 | Input demasiado longo | Excede janela de contexto da feature | Não | Reduzir input |
| AI_004 | 422 | Conteúdo recusado | Filtros de segurança/abuse | Não | Rever conteúdo; ver política de uso |

## Domínio TENANT

| Código | HTTP | Título | Causa | Retryable | Ação do cliente |
|---|---|---|---|---|---|
| TENANT_001 | 404 | Tenant não encontrado | ID inexistente **ou sem acesso** (não distinguimos, por segurança) | Não | Verificar ID e permissões |
| TENANT_002 | 403 | Tenant suspenso | Suspensão administrativa ou de billing | Não | Contactar suporte |
| TENANT_003 | 409 | Limite de recursos | Máximo de utilizadores/projetos do plano | Não | Upgrade de plano |

## Domínio GEN (transversal)

| Código | HTTP | Título | Retryable |
|---|---|---|---|
| GEN_001 | 400 | Pedido malformado (validação) — `errors[]` com detalhe por campo | Não |
| GEN_002 | 429 | Rate limit global — `Retry-After` presente | Sim |
| GEN_003 | 500 | Erro interno — sem detalhe, com `trace_id` | Sim (1 retry) |
| GEN_004 | 503 | Manutenção/indisponibilidade | Sim |

## Processo para adicionar um erro

1. PR a este documento com a linha nova (código sequencial no domínio).
2. Página de documentação criada no mesmo PR.
3. Constante adicionada ao pacote partilhado `@empresa/errors` (única fonte usada pelo código — strings hardcoded são bloqueadas em lint).
4. Erros 5xx novos definem se geram alerta e em que threshold.
