# CLAUDE.md — Instruções de engenharia (ExodoFlow AI)

> Versão **adaptada à realidade do ExodoFlow** a partir do kit eeos genérico.
> As políticas completas estão em `eeos/eeos/` — este ficheiro aponta para elas, não as duplica.
> ⚠️ Diferenças face ao kit genérico: o ExodoFlow usa **Route Handlers do Next** (não Edge Functions/Deno),
> estrutura `src/services` + `src/components/features` (não `src/modules`), e roles próprios.

## O projeto

SaaS **multi-tenant** para agenda e automação com IA, nicho inicial clínicas de estética. Cada cliente (tenant) opera isolado: utilizadores, dados, marcações e comunicações pertencem a um tenant e nunca atravessam essa fronteira. A IA é **camada de conversa apenas** — nunca controla a agenda; quem decide disponibilidade é o sistema.

**Stack real:**
- Frontend: Next.js 16 (App Router) + TypeScript strict + Tailwind v4 + design-system próprio (estilo Shadcn) em `src/components/design-system`
- Backend: Supabase — PostgreSQL com Row Level Security (RLS), Auth e Storage
- Mutações sensíveis: **Route Handlers** em `src/app/api/*/route.ts` com `createAdminClient` (service_role), validando sempre o tenant da sessão
- Dados: TanStack Query (hooks) + serviços; validação com Zod + React Hook Form; datas com date-fns
- IA / WhatsApp real / pagamentos: integrados por fases (ver `docs/`). Sem Stripe/billing nesta fase.

## Comandos de verificação (correr a partir de `exodoflow/`, antes de dar por terminado)

```bash
cd exodoflow
npm run lint          # ESLint (0 erros)
npm run build         # Next build — também faz o type-check (tsc)
npm test              # Vitest
cd .. && node audit-exodoflow-full.mjs   # Auditor de invariantes do projeto
```

Para mudanças de schema: `npx supabase migration up` (incremental). Se algum passo falhar, a tarefa **não** está pronta — reportar o estado no final.

## Estrutura do repositório

```
exodoflow/                       # a aplicação (este é o repositório git)
  src/
    app/                         # rotas Next (App Router): páginas, layouts, /api/*/route.ts
    components/{design-system,features,layout}/
    services/                    # acesso a dados/integração (whatsapp, bookings, clients, ...)
    hooks/                       # TanStack Query + helpers React
    lib/{supabase,validators,permissions,whatsapp,i18n}/
    providers/                   # AuthProvider e contexto
    types/{domain,database.ts}   # database.ts é GERADO — nunca editar tipos de tabela à mão
supabase/migrations/             # única forma de mudar schema (incremental, não-destrutivo)
supabase/seed.sql
docs/                            # documentação por fase (ex: whatsapp-phase-1c-templates.md)
audit-exodoflow-full.mjs         # auditor — valida as invariantes; toda a fase nova adiciona checks
```

Ficheiros novos seguem esta estrutura. Na dúvida sobre onde algo pertence, perguntar.

## Regras invioláveis (sem exceções)

1. **Tenant isolation via RLS.** Toda a tabela com dados de cliente tem `tenant_id NOT NULL` + RLS ativa (`ENABLE ROW LEVEL SECURITY` + policies por tenant do JWT, via `auth_tenant_id()`). Route Handlers com service_role filtram **também** por `tenant_id` (defesa em profundidade). O `tenant_id` vem **sempre da sessão**, nunca do browser.
2. **`SUPABASE_SERVICE_ROLE_KEY` nunca sai do servidor.** Só em Route Handlers (`createAdminClient`), nunca com prefixo `NEXT_PUBLIC_`, nunca no browser. A service role ignora RLS — uso exige justificação em comentário + filtro manual de tenant.
3. **Sem secrets no código.** Variáveis via `.env.local` (dev) e env do host (prod). Tokens de canais (ex: WhatsApp `access_token`) vivem em `communication_channels.config`, nunca em env nem no frontend.
4. **Mutações sensíveis passam pelo servidor.** Auth, criação de empresa, permissões, envio de WhatsApp e tudo que envolva secrets vive em Route Handlers — nunca lógica de segurança só no cliente. Leituras simples podem usar o cliente Supabase com RLS.
5. **Validar todo o input externo** com Zod em `src/lib/validators/` — no formulário (UX) **e** no servidor (segurança). Webhooks (ex: Meta WhatsApp) validam assinatura (HMAC) antes de processar e são idempotentes.
6. **Soft delete por default** (`deleted_at`) em dados de negócio. Conversas e logs nunca são apagados. Hard delete só via pipeline de retenção/RGPD.
7. **Sem PII em logs** (emails em claro, tokens, telefones). Logger estruturado (`src/lib/logger.ts`) com `maskPII`; níveis corretos (`error` é acionável).
8. **País, nicho e a derivação locale/moeda/fuso** são definidos na CRIAÇÃO da empresa pelo SUPERADMIN (`/api/admin/criar-empresa`). O cliente NÃO os troca (onboarding/configurações mostram-nos só-leitura). Trigger `lock_tenant_market` é o backstop.
9. **Migrações** só por ficheiros em `supabase/migrations/`, **incrementais e não-destrutivas** (`ALTER ... ADD`, alargar CHECK; nunca `DROP`/`RENAME` que perca dados). **PROIBIDO `supabase db reset`** sem autorização do dono (há dados reais). Migração que cria tabela inclui as policies RLS na mesma migração.
10. **A IA nunca controla a agenda — apenas conversa.** Quando existir, fica isolada e o input do utilizador é tratado como não confiável (prompt injection). O simulador de WhatsApp usa estrutura idêntica ao webhook real.
11. **`any` proibido** sem comentário a justificar. TypeScript strict. `src/types/database.ts` é gerado (`supabase gen types`) e committed — nunca escrever tipos de tabela à mão.

## Convenções

- **Commits:** Conventional Commits (`eeos/eeos/CONVENTIONAL_COMMITS.md`). Escopos: `auth`, `tenant`, `agenda`, `clientes`, `servicos`, `recursos`, `whatsapp`, `onboarding`, `branding`, `equipa`, `admin`, `api`, `web`, `db`, `docs`, `deps`, `ci`.
- **Nomes:** `PascalCase.tsx` (componentes), `useX.ts` (hooks), `x.ts` (serviços em `src/services`), validadores em `src/lib/validators/x.ts`.
- **Comentários em português**, explicando o *porquê* (regras de negócio, segurança), não o óbvio. Policies RLS levam comentário SQL com a regra.
- **Componentes ≤ ~250 linhas**; acima, dividir. Server Components por default; `"use client"` só com interatividade.
- **Toda a tela** tem loading, error e empty states; formulários têm validação, mensagens claras em português e proteção contra duplo submit.
- **Mobile-first obrigatório.** Acessibilidade WCAG 2.2 AA (axe sem violações serious/critical).
- **Ações importantes** (login, criação de empresa, equipa, envio de WhatsApp, branding) geram registo de auditoria (RPC `record_audit_log` / `record_system_audit_log`), sem tokens nos metadados.
- **Roles (RBAC):** `superadmin`, `owner`, `manager`, `receptionist`, `staff` — fonte de verdade em `src/types/domain/permission.ts`, verificados em RLS **e** no servidor, nunca só na UI.

## Como trabalhar

**Antes de mexer:** ler o código relevante e seguir o padrão existente — não "melhorar" arquitetura, renomear ou refatorar fora do âmbito sem propor primeiro. **Esta versão do Next tem breaking changes**: ler o guia em `node_modules/next/dist/docs/` antes de escrever código de rotas/APIs.

**Tarefas não-triviais** (migrações, RLS, auth, WhatsApp, IA, refactors): plano curto antes — o que entendi, ficheiros afetados, riscos, como testar, rollback. Tarefas pequenas: implementar diretamente.

**Nunca:** apagar código/ficheiros sem explicar; remover validações/permissões/RLS/filtros de tenant "para simplificar"; usar service role para contornar RLS sem justificação; mudar comportamento existente sem assinalar; silenciar erros (catch vazio, `@ts-ignore` sem justificação).

**No final**, resumir proporcional à tarefa: o que foi feito e porquê, ficheiros, como testar, riscos, estado de lint/build/test/auditor.

## Definition of Done

Cumpre `eeos/eeos/DEFINITION_OF_DONE.md`: código + testes (caso de erro + isolamento de tenant quando aplicável) + docs + logs + rollback. O auditor `audit-exodoflow-full.mjs` é parte da rede de segurança.

## Referências (fonte de verdade — não duplicar)

| Tema | Documento |
|---|---|
| Commits | `eeos/eeos/CONVENTIONAL_COMMITS.md` |
| Versionamento de API | `eeos/eeos/API_VERSIONING_POLICY.md` |
| RFC/ADR | `eeos/eeos/RFC_PROCESS.md` |
| Migrações de schema | `eeos/eeos/EXPAND_AND_CONTRACT.md` |
| Retenção / RGPD | `eeos/eeos/DATA_RETENTION_POLICY.md` |
| Security headers | `eeos/eeos/SECURITY_HEADERS.md` |
| Acessibilidade | `eeos/eeos/ACCESSIBILITY_STANDARDS.md` |
| Definition of Done | `eeos/eeos/DEFINITION_OF_DONE.md` |
| Dependências | `eeos/eeos/DEPENDENCY_UPDATE_POLICY.md` |
| Performance | `eeos/eeos/PERFORMANCE_STANDARDS.md` |
| Códigos de erro | `eeos/eeos/ERROR_CATALOG.md` |
