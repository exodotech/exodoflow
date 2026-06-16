# Deploy — ExodoFlow Pro (produção)

> 👉 Para a sequência **executável passo-a-passo** (local → produção, com as
> caixas a marcar), usa **[go-live-checklist.md](go-live-checklist.md)**. Este
> ficheiro é o guia de contexto; o checklist é a lista de execução.

Guia para pôr o ExodoFlow Pro online. O produto está completo a nível de código;
isto cobre a infraestrutura. Tempo estimado: ~1–2h.

> Stack: Next.js (App Router) + Supabase (Postgres + RLS). Deploy recomendado: **Vercel** (app) + **Supabase Cloud** (BD).

---

## 0. Pré-requisitos
- Conta **Supabase** (supabase.com) e **Vercel** (vercel.com)
- Repositório no GitHub (já existe: `exodotech/exodoflow`)
- Supabase CLI: `npm i -g supabase`
- Um domínio (opcional mas recomendado)

---

## 1. Supabase Cloud (base de dados)

1. **Criar projeto** no painel Supabase → guardar a *database password*.
2. **Ligar o CLI ao projeto** (a partir da raiz `exodoflowIA/`):
   ```bash
   supabase link --project-ref SEU_PROJECT_REF
   ```
3. **Aplicar as migrações** (as 36 da pasta `supabase/migrations/`):
   ```bash
   supabase db push
   ```
   > ⚠️ NÃO correr `supabase db reset` no projeto remoto — apaga tudo.
4. **NÃO aplicar o seed** (`supabase/seed.sql` é só para dev — tem senhas fracas).
5. **Copiar as chaves**: Project Settings → API → `Project URL`, `anon key`, `service_role key`.

### Criar o SUPERADMIN de produção
O seed de dev não vai para produção. Crie o superadmin uma vez:
1. Supabase → Authentication → Add user → e-mail + senha **forte**.
2. SQL Editor:
   ```sql
   update profiles set role = 'superadmin', tenant_id = null
   where id = (select id from auth.users where email = 'admin@SEU-DOMINIO');
   ```
3. Em Authentication → Providers → Email: **desligar "Enable signups"** (acesso só por convite).

---

## 2. Vercel (aplicação)

1. **Importar** o repositório no Vercel.
2. **Root Directory**: `exodoflow`
3. **Environment Variables** (copiar de `exodoflow/.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` = o domínio final (ex: `https://app.seudominio.com`)
   - Modos simulados a `true` (WhatsApp/relatórios/assistente) até ligar os serviços reais
4. **Deploy**. No fim, abrir o URL e confirmar o login do superadmin.

---

## 3. Domínio (opcional)
- Vercel → Project → Settings → Domains → adicionar o domínio e seguir as instruções de DNS.
- Atualizar `NEXT_PUBLIC_APP_URL` para o domínio final e re-deploy.

---

## 4. Checklist de pré-lançamento

- [ ] Migrações aplicadas (`supabase db push` sem erros)
- [ ] Superadmin criado com senha forte; signups desligados
- [ ] `SUPABASE_SERVICE_ROLE_KEY` só no Vercel (nunca no cliente/repo)
- [ ] `NEXT_PUBLIC_APP_URL` aponta para o domínio real
- [ ] Login funciona; criar 1ª empresa pelo painel `/admin`
- [ ] `npm run build` local sem erros · `node audit-exodoflow-full.mjs` verde
- [ ] (Recomendado) `NEXT_PUBLIC_SENTRY_DSN` para monitorização de erros
- [ ] Rever `docs/security-checklist.md`

---

## 5. Ligar os serviços reais (depois do lançamento)

| Serviço | Como | Variáveis | Pôr a `false` |
|---|---|---|---|
| **WhatsApp** (Meta) | App na Meta for Developers → WhatsApp Cloud API; webhook em `/api/whatsapp/webhook` | `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` | `WHATSAPP_OUTBOUND_MOCK`, `WHATSAPP_TEMPLATE_MOCK` |
| **Assistente IA** | Chave Claude (console.anthropic.com) | `ANTHROPIC_API_KEY` | `ASSISTANT_MOCK` |
| **Lembretes automáticos** | Já configurado: `vercel.json` agenda `GET /api/cron/lembretes` de hora a hora. Só falta definir `CRON_SECRET` no Vercel. | `CRON_SECRET` | (usa `WHATSAPP_OUTBOUND_MOCK`) |
| **Relatórios por e-mail** | Provedor de e-mail (Resend/SMTP) | (a integrar) | `RELATORIO_MOCK` |
| **Pagamentos** | Stripe (a integrar quando cobrar subscrições) | — | — |

> O sistema funciona 100% em modo simulado — pode lançar primeiro e ligar estes serviços um a um, sem parar a app.
