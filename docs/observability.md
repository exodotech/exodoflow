# ExodoFlow AI — Observabilidade

> Como a aplicação reporta saúde, erros e acções. Preparação para beta fechado.

## 1. Logger central (`src/lib/logger.ts`)

Níveis: `info` · `warn` · `error` · **`audit`** (acção de negócio) · **`security`** (evento de segurança).

```ts
logger.audit('Cliente criado', { action: 'client.create', entity: 'clients', entity_id })
logger.security('Acesso negado', { action: 'admin.criar_empresa' })
logger.error('Falha inesperada', { scope: 'route:/dashboard' })
```

Privacidade: `maskPII()` para telefone/e-mail/NIF. **Nunca** logar passwords, tokens ou `service_role`.

## 2. Erros (`src/lib/observability.ts` + error boundaries)

- `reportError(error, ctx)` é o ponto **único** de reporte (vendor-agnóstico).
- Error boundaries: `app/error.tsx` (rota) e `app/global-error.tsx` (raiz) chamam `reportError` e oferecem "Tentar novamente / Voltar ao início".
- **Sentry:** `isSentryConfigured()` indica se `NEXT_PUBLIC_SENTRY_DSN` existe. Quando existir e o SDK estiver instalado, o encaminhamento faz-se em `flushToSink()` — **um único sítio**. Sem DSN, a app **não quebra** (regista via logger).

### Ligar o Sentry (produção)
1. `npm i @sentry/nextjs`
2. Definir `NEXT_PUBLIC_SENTRY_DSN` (+ `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` para releases).
3. Em `flushToSink()`, encaminhar para `Sentry.captureException/captureMessage` com contexto `tenant_id`/`user_id`.

## 3. Health checks (`/api/health`)

```json
{ "status": "ok | degraded | down", "version": "...", "timestamp": "...",
  "checks": { "app": "ok", "database": "ok", "auth": "ok", "storage": "ok" } }
```

- `down` (503) se a base de dados não responde; `degraded` se auth/storage falham; `ok` caso contrário.
- Não expõe segredos. Monitorização externa deve fazer poll a este endpoint.
- Visual: `/dashboard/sistema` (OWNER) — re-verifica a cada 60s.

## 4. Auditoria (`audit_logs`)

- Trilho **append-only** escrito via RPC `record_audit_log` (SECURITY DEFINER); `tenant_id`/`actor_id` vêm do JWT.
- Serviço: `registarAuditoria(action, { table, recordId, metadata })` — nunca quebra a operação principal.
- Acções cobertas: cliente (criar/editar/apagar/converter), visitante, marcação (criar/cancelar/reagendar), equipa (role/suspender/reactivar), empresa, branding.
- Visual: `/dashboard/auditoria` (OWNER/MANAGER), com filtro por acção.

## 5. Rate limiting (`src/lib/rate-limit.ts`)

- Readiness in-memory (dev/single-node). Aplicado em `/api/admin/criar-empresa` e `/api/equipa/criar-membro`.
- Produção: trocar o store por Upstash Redis / tabela Supabase / Cloudflare (mesma interface `checkRateLimit`).

## 6. Como investigar um incidente

1. `/api/health` e `/dashboard/sistema` → o quê está `degraded/down`.
2. `/dashboard/auditoria` → o que foi feito, por quem, quando.
3. Logs `[ERROR]`/`[SECURITY]`/`[observability]` no servidor.
4. Reproduzir em janela anónima; usar `/dev/diagnostics` (dev) para limpar sessão.
5. Seguir [`incident-response.md`](./incident-response.md) para o sintoma concreto.

## 7. Erros conhecidos / notas

- `next/image` rejeita IPs privados (Supabase local) — logos usam `<img>` resiliente.
- `supabase gen types` exige `SUPABASE_ACCESS_TOKEN` mesmo em `--local` (token dummy serve); nunca redirecionar stdout direto para `database.ts`.
