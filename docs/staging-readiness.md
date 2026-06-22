# Staging Readiness — ExodoFlow Pro

Checklist de validação antes do primeiro deploy em staging.  
Preencher da esquerda para a direita: [ ] → [x]

---

## 1. Variáveis de Ambiente

### Obrigatórias (sem estas a app não arranca)

| Var | Propósito | Staging | Produção |
|-----|-----------|---------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | [ ] | [ ] |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (anon) | [ ] | [ ] |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave server-only (service_role) | [ ] | [ ] |
| `NEXT_PUBLIC_APP_URL` | URL pública da app (sem barra final) | [ ] | [ ] |
| `CRON_SECRET` | Segredo para /api/cron/* (valor aleatório forte) | [ ] | [ ] |

### Recomendadas para staging

| Var | Propósito | Staging |
|-----|-----------|---------|
| `SECRET_ENCRYPTION_KEY` | AES-256-GCM para tokens WhatsApp | [ ] |
| `NEXT_PUBLIC_APP_VERSION` | Versão da app (ex: 0.1.0-beta) | [ ] |

### Mocks ativos em staging (manter true até ligar reais)

| Var | Valor staging | Valor produção |
|-----|--------------|----------------|
| `WHATSAPP_OUTBOUND_MOCK` | `true` | `false` (quando WhatsApp real) |
| `WHATSAPP_TEMPLATE_MOCK` | `true` | `false` |
| `RELATORIO_MOCK` | `true` | `false` (quando email real) |
| `ASSISTANT_MOCK` | `true` | `false` (quando Claude API real) |
| `EMAIL_MOCK` | `true` | `false` (quando Resend real) |
| `BILLING_MOCK` | `true` | `false` (quando Stripe real) |

### Opcionais (apenas quando ligar serviços reais)

| Var | Serviço |
|-----|---------|
| `WHATSAPP_VERIFY_TOKEN` | WhatsApp Cloud API |
| `WHATSAPP_APP_SECRET` | WhatsApp (assinatura de webhook) |
| `ANTHROPIC_API_KEY` | Claude API (IA assistente) |
| `RESEND_API_KEY` | Email transacional |
| `EMAIL_FROM` | Remetente de email |
| `STRIPE_SECRET_KEY` | Stripe (billing real) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry (observabilidade) |

---

## 2. Vercel

| Item | Verificação | Estado |
|------|-------------|--------|
| **Root Directory** | Definir `exodoflow` em Project Settings → General → Root Directory | [ ] |
| **Node version** | 20.x (confirmar em Project Settings → General) | [ ] |
| **Crons** | `vercel.json` tem `/api/cron/lembretes` (cada hora) e `/api/cron/retencao` (3h diário) | ✅ |
| **Env vars** | Adicionar todas as obrigatórias no painel Vercel (nunca no código) | [ ] |
| **Preview deploys** | Desativar para branches com dados sensíveis (ou garantir env de staging separado) | [ ] |
| **Build command** | `npm run build` (default do Next.js — correto) | ✅ |
| **Output directory** | `.next` (default — correto) | ✅ |

---

## 3. Supabase Cloud

### Projeto

| Item | Verificação | Estado |
|------|-------------|--------|
| **Região** | Selecionar EU West (Frankfurt) para RGPD | [ ] |
| **Plan** | Pro (para IPv4, PITR, backups diários) | [ ] |
| **PITR (backups)** | Ativar Point-in-Time Recovery | [ ] |

### Migrations

| Item | Verificação | Estado |
|------|-------------|--------|
| **Aplicar todas as migrations** | `supabase db push` ou via CLI | [ ] |
| **Verificar ordem** | 0001 → 0051 (nenhuma em falta) | [ ] |
| **Seed de DEV** | NÃO aplicar em produção (apenas dev/staging com dados fictícios) | [ ] |
| **Seed de PROD** | Apenas planos (`plans`) — sem utilizadores/tenants fictícios | [ ] |

### Auth

| Item | Verificação | Estado |
|------|-------------|--------|
| **Site URL** | `https://app.seudominio.com` (produção) ou URL de staging | [ ] |
| **Redirect URLs** | Adicionar `https://app.seudominio.com/auth/callback` | [ ] |
| **Enable signup** | **DESATIVAR** (`enable_signup = false`) — acesso por convite | [ ] |
| **Email templates** | Personalizar reset-password e invite (logo + texto PT) | [ ] |
| **SMTP custom** | Configurar Resend (ou outro) para emails de auth não ficarem no spam | [ ] |
| **Rate limits** | Confirmar limites de OTP e magic link | [ ] |

### Storage

| Item | Verificação | Estado |
|------|-------------|--------|
| **Bucket `tenant-logos`** | Criar com política RLS (público para leitura, privado para escrita) | [ ] |
| **Max file size** | Definir limite (ex: 2MB) | [ ] |
| **Allowed MIME types** | `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml` | [ ] |

### Row-Level Security

| Item | Verificação | Estado |
|------|-------------|--------|
| **RLS ativo em todas as tabelas** | Verificar via `supabase db diff` ou painel | [ ] |
| **Isolation test** | `psql -f supabase/tests/rls-isolation.test.sql` em staging | [ ] |

---

## 4. Email (Resend)

| Item | Verificação | Estado |
|------|-------------|--------|
| **Domínio verificado no Resend** | SPF + DKIM + DMARC configurados | [ ] |
| **`EMAIL_MOCK=false`** | Apenas quando domínio verificado | [ ] |
| **`RESEND_API_KEY`** | Definida em Vercel (nunca no código) | [ ] |
| **`EMAIL_FROM`** | `ExodoFlow Pro <no-reply@seudominio.app>` | [ ] |
| **Email de reset password** | Vai pelo Supabase Auth SMTP (separado do Resend) | ✅ |
| **Email de convite** | Vai pelo Supabase Auth SMTP | ✅ |
| **Email de relatório** | Vai pelo Resend (lib/email/send.ts) | [ ] |
| **Teste end-to-end** | Enviar email de teste e confirmar entrega | [ ] |

---

## 5. Auth URLs — Checklist Final

```
Supabase → Authentication → URL Configuration

Site URL:         https://app.seudominio.com
Redirect URLs:    https://app.seudominio.com/auth/callback
                  https://staging.seudominio.com/auth/callback  (staging)
```

| Item | Estado |
|------|--------|
| Site URL definida | [ ] |
| Redirect URL da produção adicionada | [ ] |
| Redirect URL de staging adicionada | [ ] |
| Testar fluxo completo: login → callback → dashboard | [ ] |
| Testar forgot-password: email → link → reset → login | [ ] |

---

## 6. Domínio e HTTPS

| Item | Estado |
|------|--------|
| Domínio apontado para Vercel (DNS A/CNAME) | [ ] |
| SSL/TLS automático do Vercel ativo | [ ] |
| `www` → redirect para `app.` (ou configurar ambos) | [ ] |
| HSTS ativo (já no next.config.ts) | ✅ |

---

## 7. Observabilidade (Sentry — opcional mas recomendado)

| Item | Estado |
|------|--------|
| Criar projeto Sentry | [ ] |
| `NEXT_PUBLIC_SENTRY_DSN` definida no Vercel | [ ] |
| Verificar que erros chegam ao Sentry em staging | [ ] |

---

## 8. Smoke Test Pós-Deploy

Executar manualmente após cada deploy em staging:

- [ ] Landing page carrega em modo claro e escuro
- [ ] Login com conta de teste → chega ao dashboard
- [ ] Dark mode toggle persiste após reload
- [ ] Portal público `/marcar/[slug]` carrega
- [ ] `/api/health` responde `{ status: "ok" }`
- [ ] `/privacidade` e `/termos` mostram aviso "em revisão jurídica"
- [ ] Logout → redireciona para /login
- [ ] Acesso direto a /dashboard sem auth → redireciona para /login

---

## Critério de Aprovação para Staging

**APROVADO** quando todos os itens da secção 1, 2, 3 (migrations + auth + storage) e 8 estiverem ✅.

As secções de Email (4), Domínio (6) e Sentry (7) podem ficar para produção.
