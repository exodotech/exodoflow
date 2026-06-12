# ExodoFlow AI — Resposta a Incidentes

> Guia rápido para diagnosticar e resolver problemas comuns. Ambiente local/dev.
> Ver também [`observability.md`](./observability.md) e [`security-checklist.md`](./security-checklist.md).

## Primeiro diagnóstico (sempre)

1. **Health check:** abrir `GET /api/health` → `status: ok | degraded | down` + checks (app/database/auth/storage).
2. **Painel Sistema:** `/dashboard/sistema` (OWNER) mostra o mesmo de forma visual.
3. **Docker:** confirmar que o Supabase local está a correr (ver §9).
4. **Logs do browser/servidor:** procurar linhas `[ERROR]` / `[SECURITY]` / `[observability]`.

## 1. Login não funciona
- Confirmar Supabase a correr (`/api/health` → database `ok`).
- Sessão corrompida: abrir janela anónima ou `/dev/diagnostics` → `forceLogout()`.
- `enable_signup = false` é esperado — contas só por convite/superadmin.

## 2. Dashboard não abre
- O cabeçalho deve aparecer sempre; o corpo mostra loading/erro inline.
- Se ficar em branco: ver consola por erro de render; a `error.tsx` mostra "Tentar novamente / Voltar ao início".

## 3. Agenda não carrega
- Verificar `database` no health. Slots vêm de RPC `get_available_slots` (precisa de disponibilidade configurada no recurso).

## 4. Booking duplicado
- Não deve acontecer: `create_booking` é transacional com lock por recurso. Se suspeitar, consultar `audit_logs` (acção `booking.create`) e `bookings` por recurso/hora.

## 5. Cliente "desapareceu"
- Soft-delete: `deleted_at` preenchido (não é apagado de facto). A lista filtra `deleted_at IS NULL`.
- Confirmar em `clients` por `id`. Visitantes aparecem com `is_guest = true`.

## 6. RLS bloqueia dados
- Sintoma: query devolve vazio sem erro. Confirmar `tenant_id` do utilizador (JWT/profile) e a policy da tabela.
- Auditoria (`audit_logs`) só é visível a owner/manager (policy de SELECT).

## 7. Tenant sem onboarding
- `tenants.onboarding_completed = false` → o owner é levado ao `/onboarding`.
- País/nicho são definidos na criação (superadmin); o owner completa o resto.

## 8. Supabase local caiu
```bash
npx supabase status          # estado dos containers
npx supabase start           # arrancar
npx supabase migration up    # aplicar migrações pendentes (NUNCA db reset com dados)
```

## 9. Verificar o Docker
```bash
docker ps                                  # containers a correr
docker ps --format '{{.Names}}' | grep supabase
docker logs supabase_db_exodoflowIA --tail 50
```

## 10. Limpar sessão
- `/dev/diagnostics` (404 em produção) → `forceLogout()`; ou apagar cookies `sb-*` no browser.

## 11. Verificar logs
- Servidor: consola do `npm run dev` / output do deploy.
- Estruturados: linhas `[AUDIT]`, `[SECURITY]`, `[ERROR]`, `[observability]`.
- Trilho de auditoria de negócio: `/dashboard/auditoria` (OWNER/MANAGER).

## 12. Restaurar backup
- Produção (Supabase Cloud): usar Point-in-Time Recovery / backups do projeto no dashboard Supabase.
- Local: os dados são descartáveis; recriar com `migration up` (+ seed só num ambiente vazio).
- **Nunca** correr `supabase db reset` num ambiente com dados reais.
