# Go-Live — Checklist Executável (local → produção)

> Preparação para produção do **ExodoFlow Pro**. Passo a passo, da máquina local
> até online. **Não adiciona funcionalidades** — apenas configura e valida.
> Marca cada `[ ]` à medida que avanças. Tempo estimado: ~2–4 h (sem contar
> aprovações externas: Meta/templates, jurídico).

Convenções: comandos correm a partir de `exodoflow/` salvo indicação. Substitui
`SEU-*` pelos teus valores. **Nunca** commites segredos.

---

## FASE 0 — Pré-voo (validar local antes de sair da máquina)

```bash
cd exodoflow
npm ci
npm run type-check          # 0 erros
npm run lint                # 0 erros (3 warnings pré-existentes ok)
npm test                    # 110 testes verdes
npm run build               # compila
node ../audit-exodoflow-full.mjs   # 715/715, 0 problemas
```
- [ ] Tudo verde acima.
- [ ] **Sem localhost hardcoded** (confirmado: o código usa `NEXT_PUBLIC_APP_URL`; nada a corrigir).
- [ ] Teste de isolamento (precisa do Supabase local a correr):
  ```bash
  docker exec -i "$(docker ps --filter name=supabase_db -q | head -1)" \
    psql -U postgres -d postgres < ../supabase/tests/rls-isolation.test.sql
  # esperar:  >>> ISOLAMENTO OK <<<
  ```

### Docker / Supabase local (só dev — NÃO vai para produção)
- [ ] Confirmar que o Docker/Supabase local **não** é usado em produção. Produção = **Supabase Cloud** (gerido, sem Docker) + **Vercel**.
- [ ] Parar o local quando terminares: `npx supabase stop` (preserva o volume).

---

## FASE 1 — Supabase Cloud (base de dados de produção)

1. [ ] Criar projeto em supabase.com → guardar a **database password** e a **região**.
2. [ ] Ligar o CLI (a partir da raiz `exodoflowIA/`):
   ```bash
   supabase link --project-ref SEU_PROJECT_REF
   ```
3. [ ] **Aplicar as 50 migrações** (de raiz, em ordem):
   ```bash
   supabase db push
   ```
   > ⚠️ **NUNCA** `supabase db reset` no remoto.
4. [ ] **NÃO** aplicar o seed (`supabase/seed.sql` é dev — senhas fracas).
5. [ ] Copiar as chaves: Project Settings → API → **Project URL**, **anon key**, **service_role key**.

### Auth — URLs (gotcha crítico)
6. [ ] Authentication → **URL Configuration**:
   - **Site URL** = `https://SEU-DOMINIO` (NÃO localhost — senão os emails de reset apontam para localhost).
   - **Redirect URLs** = `https://SEU-DOMINIO/**`.
7. [ ] Authentication → Providers → **Email**: **desligar "Enable signups"** (acesso só por convite; já é o default do projeto).

### Superadmin de produção (sem seed)
8. [ ] Authentication → Add user → email + **senha FORTE** (não `admin12345`).
9. [ ] SQL Editor:
   ```sql
   update profiles set role='superadmin', tenant_id=null
   where id=(select id from auth.users where email='admin@SEU-DOMINIO');
   ```

### Backups / PITR (não perder dados)
10. [ ] Database → **Backups**: confirmar backups diários ativos.
11. [ ] Ativar **PITR** (Point-in-Time Recovery) — requer plano **Pro**. Sem PITR, perda até ~24h (último backup diário). Ver `docs/backup-and-recovery.md`.
12. [ ] Testar 1 restauro num projeto de teste antes de confiar (boa prática).

### SMTP (emails de auth: reset/convites)
13. [ ] Authentication → **SMTP Settings**: configurar provedor (Resend/SES/SMTP) — senão os emails de auth não saem em produção. (O email transacional próprio usa `RESEND_API_KEY`, ver Fase 5.)

### Storage
14. [ ] Confirmar o bucket `tenant-logos` (público) e as **policies** por pasta `{tenant_id}/`. A migração 0010 avisa que, no remoto, as policies de `storage.objects` podem ter de ser criadas no Dashboard (Storage → Policies) com as mesmas regras.

---

## FASE 2 — App (Vercel)

15. [ ] Importar o repositório no Vercel.
16. [ ] **Root Directory** = `exodoflow`.
17. [ ] **Environment Variables** (Production) — copiar de `exodoflow/.env.example`:

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key *(server-only — sem `NEXT_PUBLIC_`)* |
| `NEXT_PUBLIC_APP_URL` | `https://SEU-DOMINIO` |
| `NEXT_PUBLIC_APP_VERSION` | ex.: `1.0.0` |
| `CRON_SECRET` | segredo aleatório forte |
| `WHATSAPP_OUTBOUND_MOCK` / `WHATSAPP_TEMPLATE_MOCK` | `true` até ligar o WhatsApp |
| `ASSISTANT_MOCK` / `RELATORIO_MOCK` / `EMAIL_MOCK` / `BILLING_MOCK` | `true` até ligar cada serviço |

18. [ ] **Deploy**. Confirmar build verde no Vercel.
19. [ ] Confirmar que os **crons** do `vercel.json` aparecem em Vercel → Settings → Cron Jobs (`/api/cron/lembretes` horário, `/api/cron/retencao` diário). Exigem `CRON_SECRET` definido (Vercel envia o `Authorization: Bearer`).

---

## FASE 3 — Domínio + HTTPS

20. [ ] Vercel → Project → Settings → **Domains** → adicionar `SEU-DOMINIO` e seguir o DNS.
21. [ ] HTTPS é **automático** no Vercel (certificado gerido). Confirmar o cadeado.
22. [ ] Atualizar `NEXT_PUBLIC_APP_URL` para o domínio final e **re-deploy**.
23. [ ] Atualizar o **Site URL/Redirect** no Supabase (Fase 1.6) para o domínio final.
24. [ ] HSTS já vem no `next.config.ts` (`Strict-Transport-Security`) — confirmar nos response headers.

---

## FASE 4 — Verificação pós-deploy (smoke de produção)

25. [ ] **Health:** `https://SEU-DOMINIO/api/health` → `{"status":"ok"}` (database/auth/storage = ok).
26. [ ] **Login** do superadmin de produção em `/admin`.
27. [ ] Criar a **1ª empresa** pelo painel `/admin` → confirmar isolamento.
28. [ ] **Portal público:** ativar o flag `booking_portal` numa empresa e abrir `https://SEU-DOMINIO/marcar/o-slug` → ver dias livres e marcar.
29. [ ] **robots.txt** (`/robots.txt`) bloqueia `/dashboard`, `/admin`, `/api`. **404 com marca** numa rota inexistente.
30. [ ] Confirmar que `service_role` **não** aparece no bundle:
   ```bash
   # após build de produção
   grep -rl "service_role" .next/static 2>/dev/null || echo "OK: ausente"
   ```

---

## FASE 5 — Ligar serviços reais (um a um, sem parar a app)

Cada serviço tem seam pronto: define as chaves e põe o respetivo `*_MOCK=false`.

- [ ] **WhatsApp (Meta):** app na Meta for Developers → WhatsApp Cloud API.
  - Definir `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`; webhook → `https://SEU-DOMINIO/api/whatsapp/webhook`.
  - Em Configurações → WhatsApp (como owner), inserir **Phone Number ID + Access Token** (guardados server-side).
  - Pôr `WHATSAPP_OUTBOUND_MOCK=false` e `WHATSAPP_TEMPLATE_MOCK=false`. ⏳ Templates exigem **aprovação da Meta** (dias).
- [ ] **Assistente IA (Claude):** `ANTHROPIC_API_KEY` (+ opcional `ANTHROPIC_MODEL`) e `ASSISTANT_MOCK=false`.
- [ ] **Email transacional:** `RESEND_API_KEY` (+ `EMAIL_FROM`) e `EMAIL_MOCK=false`. *(Distinto do SMTP de auth da Fase 1.13.)*
- [ ] **Billing (Stripe):** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`; mapear Price IDs em `plans.features.stripe_price_monthly/yearly`; webhook → `/api/billing/webhook`; `BILLING_MOCK=false`.
- [ ] **Sentry:** `NEXT_PUBLIC_SENTRY_DSN` (observabilidade de erros). O seam já encaminha quando o DSN existir.
- [ ] **Monitorização de uptime externa** a apontar para `/api/health`.

---

## FASE 6 — Segurança final (antes do 1º cliente real)

- [ ] **Senha do superadmin** trocada (não `admin12345`). ✅ Fase 1.8.
- [ ] **CSP enforce:** recolher violações via `/api/csp-report` (já ligado, Report-Only) durante uns dias em produção; rever; depois trocar `Content-Security-Policy-Report-Only` → `Content-Security-Policy` no `next.config.ts` e validar com `npm run test:e2e` num build de produção.
- [ ] **MFA:** ativar o 2FA da própria conta de superadmin/owner (Configurações → Segurança).
- [ ] Rever `docs/security-checklist.md` e `docs/go-no-go-real-data.md` → marcar **NEEDS LEGAL REVIEW** como resolvido só após o jurídico.
- [ ] **Jurídico** (bloqueador comercial): publicar Política de Privacidade, Termos e assinar DPA (as rotas `/privacidade` e `/termos` já existem para receber o conteúdo).

---

## Resumo dos bloqueadores (ordem)
1. **Supabase Cloud** (Fase 1) — migrações + superadmin + auth URLs + PITR/SMTP.
2. **Vercel + domínio + HTTPS** (Fases 2–3).
3. **Smoke + segurança** (Fases 4 e 6) — health, isolamento, senha do superadmin.
4. **Serviços reais** (Fase 5) — ligar conforme necessidade (podes lançar em modo simulado e ligar depois).
5. **Jurídico** — antes de cobrar/tratar dados reais de clientes.

> Tudo o resto (código, segurança técnica, isolamento, privacidade) está **pronto e verificado**. Este checklist é só configuração e validação de produção.
