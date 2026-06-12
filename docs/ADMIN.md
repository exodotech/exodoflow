# ExodoFlow AI — Administração do Sistema (SUPERADMIN)

## Modelo de acesso

O ExodoFlow **não tem registo público** nesta fase:

- `enable_signup = false` no GoTrue (`supabase/config.toml`) — a API de signup
  está fechada; bloquear só a página não chegaria.
- `/register` é uma página informativa ("acesso por convite"), sem formulário.
- O login (`/login`) continua público.
- Novos tenants e owners são criados **apenas pelo SUPERADMIN**.

## Credenciais do SUPERADMIN (ambiente local/dev)

| Campo | Valor |
|---|---|
| E-mail | `admin@exodoflow.pt` |
| Password | `admin12345` |

> **EM PRODUÇÃO**: alterar a password imediatamente e criar o superadmin com
> credenciais próprias (ver "Criar um superadmin novo" abaixo).

O superadmin:
- não pertence a nenhum tenant (`profiles.tenant_id = NULL`);
- não tem acesso a dados operacionais de tenants (clientes, marcações, conversas) — o RLS bloqueia;
- tem acesso global apenas a `tenants` (listar, suspender/activar, definir plano) e `profiles` (listar);
- ao fazer login é redirecionado automaticamente para **/admin**.

## Criar uma nova empresa (tenant + owner)

### Forma recomendada — painel /admin

1. Entrar como superadmin e abrir **/admin**.
2. Na secção **"Criar nova empresa"**:
   - e-mail do proprietário;
   - nome (opcional);
   - palavra-passe temporária (há um botão para gerar uma);
   - **país** (🇵🇹 Portugal / 🇧🇷 Brasil) — define moeda, fuso e idioma;
   - **nicho** (estética, veterinária, barbearia, …) — define o template do sector.
3. **Criar empresa** — o handler server-side `/api/admin/criar-empresa` cria o
   utilizador via admin API (a service_role nunca chega ao browser) e o
   **trigger `on_auth_user_created`** provisiona:
   - um tenant novo (`onboarding_completed = false`);
   - o profile como **OWNER**;
   - o `tenant_id` no `app_metadata` do JWT.
   Em seguida o handler grava o **país** e o **nicho** escolhidos e deriva
   `timezone`/`currency`/`locale` nos settings do tenant.
4. O painel mostra as **credenciais** — copiar e entregar ao proprietário.
5. No primeiro login, o proprietário completa o **onboarding** (nome real da
   empresa, slug, serviços, recursos, horários). **País e nicho são apenas
   leitura** no onboarding e nas configurações — foram definidos aqui, na criação,
   e ficam imutáveis (trigger `lock_tenant_market`). Para os alterar, é preciso o
   suporte/superadmin.
6. Definir o **plano** da empresa no painel quando aplicável.

> Requer `SUPABASE_SERVICE_ROLE_KEY` no ambiente do servidor (`.env.local`).
> Sem ela, o handler devolve erro de configuração.

### Forma alternativa — Supabase Studio (sem service_role configurada)

1. **Authentication → Users → Add user** (marcar "Auto Confirm User").
2. O mesmo trigger provisiona o tenant + owner automaticamente.
3. Entregar as credenciais ao proprietário.

## Suspender / reactivar uma empresa

No painel **/admin**: botão **Suspender** coloca `tenants.is_active = false`.
A policy `tenants_select_own` continua a mostrar o tenant ao owner, mas a
aplicação pode usar `is_active` para bloquear o acesso (gate de plano — fase
futura). **Reactivar** repõe `is_active = true`.

Estados mostrados no painel:
- **Trial** — activa, sem plano atribuído
- **Activa** — activa, com plano
- **Suspensa** — `is_active = false`

## Criar um superadmin novo (produção)

1. Studio → Authentication → Add user (e-mail + password fortes).
2. No **SQL Editor**, executar:

```sql
-- impedir que o trigger crie tenant para este utilizador (já criado? apagar antes)
DELETE FROM profiles WHERE id = '<user_id>';
DELETE FROM tenants  WHERE id = (SELECT tenant_id FROM profiles WHERE id = '<user_id>');

INSERT INTO profiles (id, tenant_id, role, full_name)
VALUES ('<user_id>', NULL, 'superadmin', 'Nome do Admin')
ON CONFLICT (id) DO UPDATE SET role = 'superadmin', tenant_id = NULL;
```

> Alternativa: criar o utilizador via admin API com
> `app_metadata: { "is_superadmin": true }` — o trigger salta o
> provisionamento e basta inserir o profile.

## Segurança — decisões registadas

- `tenants_update_superadmin` permite UPDATE global — **apenas** a quem tem
  `profiles.role = 'superadmin'` (verificado server-side via `auth_user_role()`).
- A constraint `profiles_tenant_required` garante que só superadmins podem ter
  `tenant_id NULL`.
- `ROLE_PERMISSIONS.superadmin = []` no frontend — sem permissões operacionais
  de tenant, o dashboard normal redireciona-o para /admin.
