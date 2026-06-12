# ExodoFlow AI — Checklist de Segurança

> Estado: beta fechado / preparação para primeiros clientes reais.
> Última revisão: Fase 10.4 (segurança operacional).

Este documento resume os controlos de segurança em vigor e o que falta endurecer
antes de tráfego real (WhatsApp, clientes reais).

## 1. Isolamento multi-tenant (RLS)

- **Row Level Security activo** em todas as tabelas de dados (tenants, profiles,
  clients, services, resources, bookings, legal_consents, audit_logs, …).
- O tenant do utilizador vem do JWT (`auth_tenant_id()`), com fallback ao profile.
  O cliente **nunca** escolhe o tenant — não é possível injectar outro.
- Operações privilegiadas (criar empresa, criar membro, soft-delete, auditoria)
  passam por **RPCs SECURITY DEFINER** ou Route Handlers server-side; a
  `service_role` **nunca** chega ao browser.
- Provado: um utilizador de um tenant não vê dados de outro (policies + testes).

## 2. Papéis (roles) e permissões

| Papel | Acede |
|---|---|
| **superadmin** | Só `/admin` (tenants, planos). Sem dados operacionais de tenants (RLS bloqueia). |
| **owner** | Tudo do seu tenant, incl. equipa e billing. |
| **manager** | Operacional; sem billing nem gestão de equipa exclusiva do owner. |
| **receptionist** | Operacional limitado; sem configurações críticas. |
| **staff** | O essencial; sem equipa nem configurações. |

Controlos verificados:
- STAFF/RECEPTIONIST não editam configurações críticas (RLS + `usePermissions`).
- MANAGER não altera o OWNER (UI + trigger).
- **OWNER não pode remover/suspender/despromover o último OWNER** — `protect_last_owner` (0019).
- Ninguém escala a própria role/tenant/estado — `prevent_profile_self_escalation` (0015).

## 3. Dados sensíveis e RGPD/LGPD

- Telefone, e-mail, NIF/CPF, notas e consentimentos vivem sob RLS do tenant.
- **Consentimento de marketing** é um trilho **append-only e imutável** (`legal_consents`).
- **Visitantes** (cadastro rápido) **não** geram registo de consentimento — não
  foram questionados (0022). Consentimento só é registado quando dado de facto.
- Soft-delete (`deleted_at`) preserva histórico; anonimização RGPD à parte.
- Logs: usar `maskPII()` para telefone/e-mail/NIF; **nunca** logar passwords,
  tokens nem `service_role`. Metadata de auditoria só leva identificadores.

## 4. Auditoria (audit_logs)

- Trilho **append-only** via RPC `record_audit_log` (SECURITY DEFINER). O cliente
  não insere diretamente (RLS só permite SELECT a owner/manager); `UPDATE/DELETE`
  revogados ao `authenticated`.
- Cobertas: criar/editar/apagar/converter cliente; criar/cancelar/reagendar
  marcação; alterar role; suspender/reactivar membro; editar empresa; alterar branding.
- `tenant_id` e `actor_id` derivam do JWT — não do cliente.

## 5. Sessões e autenticação

- Signup público **desactivado** (`enable_signup = false`); acesso só por convite/superadmin.
- Logout central (`forceLogout`): limpa sessão local, expira cookies `sb-*` e
  redirecciona sempre — sessão corrompida não prende a app.
- `/dev/diagnostics` devolve **404 em produção**.
- Palavra-passe mínima alinhada com o GoTrue (≥ 8).

## 6. Rate limiting

- **Login/signup:** limitado pelo GoTrue do Supabase — `[auth.rate_limit]` em
  `supabase/config.toml`: `sign_in_sign_ups = 30` por 5 min/IP, `token_refresh = 150`.
  Em produção, considerar **captcha** (hcaptcha/turnstile) para travar credential-stuffing.
- **Rotas da app:** camada em `src/lib/rate-limit.ts` (in-memory, **só dev/single-node**),
  aplicada em `/api/admin/criar-empresa` e `/api/equipa/criar-membro`.
- **Produção:** trocar o store por distribuído (Upstash Redis, tabela Supabase ou
  Cloudflare) antes de tráfego real.

## 6.1 Cabeçalhos de segurança (HTTP)

Aplicados a todas as rotas em `next.config.ts`:
- `Strict-Transport-Security` (HSTS), `X-Frame-Options: DENY` (anti-clickjacking),
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- **CSP em modo Report-Only** (monitoriza violações sem bloquear). Antes de produção:
  validar e mudar para `Content-Security-Policy` (enforce) numa passagem dedicada.

## 6.2 Cobertura de RLS (estrutural)

- O auditor falha o CI se qualquer tabela criada nas migrações **não** tiver
  `ENABLE ROW LEVEL SECURITY` — evita o erro nº1 de Supabase (tabela sem RLS = porta aberta).
- Estado verificado: **22/22 tabelas com RLS**.

## 7. Pendente antes de produção (BLOQUEADORES)

- [ ] **Rodar a password do superadmin** (`admin12345` é default/conhecida) e mover segredos para variáveis de ambiente por ambiente. **Bloqueador de release.**
- [ ] CSP em modo enforce (hoje Report-Only) após validação.
- [ ] Rate limit distribuído (Redis/Upstash) + captcha no login.
- [ ] MFA/2FA, pelo menos para superadmin e owners.
- [ ] Sentry com DSN de produção (captura de erros + contexto tenant/user).
- [ ] Health checks monitorizados externamente.
- [ ] Backups verificados e procedimento de restauro testado (ver `docs/incident-response.md`).
- [ ] `npm audit` / revisão de dependências (CVEs) no CI.

## 8. Checklist de pentest (antes de clientes reais)

Testar, idealmente por alguém externo:

1. **Isolamento multi-tenant:** autenticado como tenant A, tentar ler/escrever dados de B (IDs forjados em queries/PostgREST). Esperado: RLS bloqueia (0 linhas).
2. **Escalada de privilégios:** staff/manager tentar `UPDATE profiles SET role='owner'` no próprio; remover o último owner. Esperado: triggers bloqueiam.
3. **Acesso a /admin:** owner/manager/staff tentar abrir `/admin` e chamar os RPCs `admin_*`. Esperado: redirect + RAISE.
4. **service_role:** confirmar que a chave nunca aparece no bundle do browser nem em respostas.
5. **IDOR:** aceder a `/dashboard/clientes/<id>` de outro tenant; descarregar logos de outro tenant no Storage.
6. **Brute-force no login:** confirmar o rate-limit do GoTrue; testar enumeração de e-mails.
7. **XSS:** injetar `<script>`/HTML em nome/notas de cliente e ver se executa (React deve escapar).
8. **CSRF:** POSTs cross-site às rotas `/api/*`.
9. **Headers:** confirmar HSTS/X-Frame-Options/nosniff presentes; tentar embeber a app num iframe.
10. **Auditoria:** confirmar que ações sensíveis ficam em `audit_logs`/`system_audit_logs` e que são append-only.

## 8. Resposta a incidentes

Ver [`docs/incident-response.md`](./incident-response.md) e
[`docs/observability.md`](./observability.md).
