# ExodoFlow AI — Plano Técnico Completo

**Papel:** CTO + Arquiteto Sénior  
**Data:** 09 de Junho de 2026  
**Versão:** 1.0  

---

## Visão Geral do Projeto

**ExodoFlow AI** é um SaaS multi-tenant para atendimento, agendamento e automação com IA, voltado para negócios que vivem de marcações.

**Primeiro nicho:** Clínicas de estética  
**Expansão futura:** Veterinárias · Barbearias · Dentistas · Oficinas · Fisioterapia

---

## Stack Obrigatória

| Tecnologia | Uso |
|---|---|
| Next.js | Framework principal (App Router) |
| TypeScript | Tipagem estática em todo o projeto |
| Tailwind CSS | Estilização mobile-first |
| Shadcn/UI | Componentes de interface |
| Supabase | Backend, Auth, Realtime, Storage |
| PostgreSQL | Base de dados relacional |
| Zod | Validação de schemas (cliente + servidor) |
| React Hook Form | Gestão de formulários |
| TanStack Query | Cache e sincronização de estado do servidor |
| date-fns | Manipulação de datas |

---

## Regras Inegociáveis

- Não gerar código rápido ou superficial
- Não criar funcionalidades falsas
- Não avançar sem revisar
- Não misturar todas as fases
- Mobile-first obrigatório
- Código comentado em português
- Comentários devem explicar o que cada parte importante faz
- Separar UI, lógica, validações e acesso a dados
- A IA nunca controla a agenda — apenas conversa
- Quem decide disponibilidade é o sistema
- WhatsApp real entra depois
- IA real entra depois
- O simulador de WhatsApp deve usar estrutura parecida com webhook real

---

## 1. Arquitetura Geral

O sistema divide-se em quatro camadas independentes:

```
┌─────────────────────────────────────────────────────────┐
│                    CAMADA DE APRESENTAÇÃO                │
│     Next.js App Router  ·  Shadcn/UI  ·  Tailwind       │
│   (Marketing · Auth · Dashboard · Portal do Cliente)    │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                    CAMADA DE APLICAÇÃO                   │
│      Server Actions  ·  API Routes  ·  TanStack Query   │
│   (Agendamento · Clientes · Serviços · Conversas)       │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                    CAMADA DE IA / AUTOMAÇÃO              │
│     Simulador WhatsApp  ·  Motor de Conversação          │
│     (READ-ONLY — nunca escreve na agenda diretamente)   │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                    CAMADA DE DADOS                       │
│       Supabase  ·  PostgreSQL  ·  RLS  ·  Realtime      │
└─────────────────────────────────────────────────────────┘
```

### Princípios Arquiteturais

| Princípio | Decisão |
|---|---|
| Isolamento de tenants | Row-Level Security (RLS) no PostgreSQL |
| Resolução de tenant | Path-based para MVP → subdomain na v2 |
| Renderização | Server Components por defeito, Client só para interatividade |
| Estado do servidor | TanStack Query com cache inteligente |
| Formulários | React Hook Form + Zod (validação dual: cliente e servidor) |
| Datas | date-fns (sem Moment, sem Day.js) |
| IA | Camada de leitura/conversa apenas — nunca INSERT em appointments |

---

## 2. Estrutura de Pastas

```
exodoflowia/
│
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (marketing)/              # Páginas públicas
│   │   │   ├── page.tsx              # Landing page
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (auth)/                   # Autenticação
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── onboarding/           # Setup inicial do tenant
│   │   │
│   │   ├── (dashboard)/              # Área protegida
│   │   │   ├── layout.tsx            # Layout com sidebar
│   │   │   ├── [tenant]/             # Contexto do tenant
│   │   │   │   ├── page.tsx          # Overview / métricas
│   │   │   │   ├── agenda/           # Calendário de agendamentos
│   │   │   │   ├── clientes/         # Gestão de clientes
│   │   │   │   ├── servicos/         # Catálogo de serviços
│   │   │   │   ├── equipa/           # Profissionais e horários
│   │   │   │   ├── conversas/        # Inbox WhatsApp
│   │   │   │   └── configuracoes/    # Configurações do tenant
│   │   │
│   │   ├── booking/                  # Portal público de agendamento
│   │   │   └── [tenant]/[slug]/      # Link único por negócio
│   │   │
│   │   └── api/
│   │       ├── webhooks/
│   │       │   └── whatsapp/         # Endpoint compatível com webhook real
│   │       ├── appointments/
│   │       ├── availability/
│   │       └── ai/
│   │           └── chat/             # Motor de conversa (simulado agora)
│   │
│   ├── components/
│   │   ├── ui/                       # Shadcn/UI (gerado, não editado)
│   │   ├── shared/                   # Componentes reutilizáveis
│   │   │   ├── calendar/
│   │   │   ├── data-table/
│   │   │   └── mobile-nav/
│   │   └── features/                 # Componentes por domínio
│   │       ├── agenda/
│   │       ├── clientes/
│   │       ├── conversas/
│   │       └── whatsapp-simulator/
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Cliente browser
│   │   │   ├── server.ts             # Cliente servidor (Server Components)
│   │   │   └── middleware.ts         # Refresh de sessão
│   │   ├── validators/               # Schemas Zod por domínio
│   │   │   ├── appointment.ts
│   │   │   ├── client.ts
│   │   │   └── service.ts
│   │   └── utils/
│   │       ├── date.ts               # Helpers date-fns
│   │       └── tenant.ts             # Resolução de tenant
│   │
│   ├── services/                     # Lógica de negócio pura
│   │   ├── appointment.service.ts
│   │   ├── availability.service.ts
│   │   ├── client.service.ts
│   │   └── conversation.service.ts
│   │
│   ├── hooks/                        # React hooks customizados
│   │   ├── use-tenant.ts
│   │   ├── use-appointments.ts
│   │   └── use-availability.ts
│   │
│   ├── types/                        # TypeScript types globais
│   │   ├── database.ts               # Tipos gerados pelo Supabase CLI
│   │   ├── tenant.ts
│   │   └── whatsapp.ts               # Tipos do payload webhook
│   │
│   └── middleware.ts                 # Auth + tenant guard
│
├── supabase/
│   ├── migrations/                   # SQL versionado
│   │   ├── 0001_tenants.sql
│   │   ├── 0002_users.sql
│   │   ├── 0003_services.sql
│   │   ├── 0004_appointments.sql
│   │   └── 0005_rls_policies.sql
│   └── seed.sql                      # Dados de teste
│
├── public/
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

**Regra de ouro da estrutura:** UI em `components/features`, lógica em `services`, validação em `validators`, acesso a dados em `lib/supabase`. Nunca misturar.

---

## 3. Estratégia Multi-Tenant

### Modelo Escolhido: Shared Database + RLS

Existem três modelos possíveis:

| Modelo | Isolamento | Custo | Complexidade | Decisão |
|---|---|---|---|---|
| Database por tenant | Máximo | Muito alto | Alta | Recusado — inviável no MVP |
| Schema por tenant | Alto | Médio | Média | Recusado — migrações complexas |
| **RLS (Row-Level Security)** | **Bom** | **Baixo** | **Baixa** | **Escolhido** |

### Como Funciona

```
1. Utilizador faz login → Supabase Auth retorna JWT
2. JWT contém custom claim: { tenant_id: "uuid-da-clinica" }
3. Todas as tabelas têm coluna: tenant_id UUID NOT NULL
4. RLS Policy em cada tabela:
   CREATE POLICY "tenant_isolation" ON appointments
   USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
5. Nenhuma query pode ver dados de outro tenant
```

### Resolução do Tenant na URL

**MVP — Path-based:**
```
exodoflow.ai/app/clinica-aurora/agenda
exodoflow.ai/app/clinica-aurora/clientes
```

**V2 — Subdomain (sem alterar código de negócio):**
```
clinica-aurora.exodoflow.ai/agenda
clinica-aurora.exodoflow.ai/clientes
```

O middleware resolve o `tenant_slug` para `tenant_id` numa lookup table em cache. O código de negócio nunca sabe se veio de path ou subdomain.

### Tabelas Core do Modelo Multi-Tenant

```sql
tenants          -- "Clínica Aurora", "Barbearia Central"
  id, slug, name, plan, settings, created_at

tenant_members   -- utilizadores ligados a um tenant
  tenant_id, user_id, role (owner | admin | staff)

-- Todas as outras tabelas têm tenant_id:
clients          -- clientes do negócio
services         -- serviços oferecidos
staff_members    -- profissionais
availability     -- horários de trabalho
appointments     -- marcações
conversations    -- conversas WhatsApp
messages         -- mensagens individuais
```

---

## 4. Estratégia Mobile-First

### Princípios

Tailwind é mobile-first por natureza. Todas as classes base são para `<640px`. Breakpoints adicionam complexidade, não retiram.

```
Base (mobile)  →  sm: (640px)  →  md: (768px)  →  lg: (1024px)
```

### Padrões Obrigatórios por Componente

| Contexto | Mobile | Desktop |
|---|---|---|
| Navegação | Bottom nav (5 ícones fixos) | Sidebar lateral colapsável |
| Calendário | Vista dia/semana compacta | Vista mensal completa |
| Tabelas | Cards em lista | Tabela tradicional |
| Formulários | Full-width, campos grandes (48px min) | Layout 2 colunas |
| Modais | Bottom sheet (slide-up) | Modal centralizado |

### Componentes Críticos para Mobile

- **Bottom Navigation Bar** — fixa em `bottom-0`, `safe-area-inset-bottom` para iOS
- **Touch targets mínimos** — 44×44px (Apple HIG) em todos os botões
- **Inputs** — `text-base` (16px) para evitar zoom automático no iOS
- **Skeleton loaders** — sempre, para evitar layout shift em 3G
- **Pull-to-refresh** — na agenda e na lista de conversas

---

## 5. Fluxo de Dados

### Fluxo 1: Agendamento via Dashboard (staff)

```
Staff abre agenda
  → Server Component carrega slots disponíveis
  → TanStack Query mantém cache + revalidação
  → Staff seleciona slot + cliente + serviço
  → React Hook Form valida com Zod (client-side)
  → Server Action valida com Zod (server-side)
  → availability.service verifica conflitos (SELECT ... FOR UPDATE)
  → INSERT em appointments
  → Realtime broadcast → outros abas atualizam
  → Confirmação SMS/WhatsApp (simulado agora)
```

### Fluxo 2: Atendimento via WhatsApp (simulador)

```
Mensagem chega ao endpoint /api/webhooks/whatsapp
  → Payload idêntico ao webhook real da Meta
  → conversation.service processa intent
  → Motor de IA lê disponibilidade (READ-ONLY)
  → IA propõe opções ao cliente via mensagem
  → Cliente confirma escolha
  → Sistema cria appointment (não a IA)
  → Confirmação enviada ao cliente
```

**Fronteira crítica:** A IA passa pelo `availability.service` para LEITURA. A criação da marcação é sempre feita pelo `appointment.service` após confirmação explícita do cliente.

### Fluxo 3: Portal de Booking Público

```
Cliente acede ao link: exodoflow.ai/booking/clinica-aurora
  → Server Component carrega serviços públicos do tenant
  → Cliente escolhe serviço → profissional → data
  → Sistema mostra slots disponíveis (calculados em tempo real)
  → Cliente preenche dados → confirma
  → Zod valida → appointment criado
  → Email/WhatsApp de confirmação
```

### Diagrama de Dependências entre Serviços

```
availability.service
       ↑ lê
appointment.service  ←── conversation.service (só propõe, não cria)
       ↑ usa
  api/appointments
       ↑ chama
  Server Actions
       ↑ invoca
  React Components
```

---

## 6. Principais Riscos Técnicos

### RISCO 1 — CRÍTICO: Vazamento de dados entre tenants
**Probabilidade:** Alta se RLS não for testado rigorosamente  
**Impacto:** Catastrófico (dados clínicos são dados sensíveis)  
**Mitigação:**
- Testes de integração que verificam isolamento cruzado
- Política de "deny by default" — RLS bloqueia tudo, policies abrem só o necessário
- Nunca usar `service_role` key no cliente browser
- Audit log de acessos

### RISCO 2 — ALTO: Race conditions na agenda
**Problema:** Dois utilizadores reservam o mesmo slot em simultâneo  
**Mitigação:**
- `SELECT ... FOR UPDATE` no PostgreSQL antes de INSERT
- Ou `unique constraint` em `(staff_id, start_time, tenant_id)`
- TanStack Query invalida cache após mutação

### RISCO 3 — ALTO: Simulador WhatsApp diverge do webhook real
**Problema:** Se o simulador não espelhar fielmente o payload real, a migração para WhatsApp real exige refactor  
**Mitigação:**
- O tipo `WhatsAppWebhookPayload` é definido AGORA com a estrutura real da Meta API
- O simulador apenas gera payloads desse tipo
- Nenhum código de negócio conhece que é simulador

### RISCO 4 — MÉDIO: Performance do calendário em mobile
**Problema:** Calendários com muitos eventos são pesados em dispositivos baixo custo  
**Mitigação:**
- Virtualização de listas (react-virtual)
- Carregar apenas o mês atual + buffer de ±1 semana
- Lazy load de detalhes de eventos

### RISCO 5 — MÉDIO: Tipos Supabase desatualizados
**Problema:** Mudanças no schema quebram silenciosamente sem TypeScript  
**Mitigação:**
- `supabase gen types typescript` no CI pipeline
- `database.types.ts` nunca editado à mão

### RISCO 6 — BAIXO: Escalabilidade do modelo RLS
**Problema:** RLS adiciona overhead em queries com milhões de rows  
**Mitigação:**
- Índices obrigatórios em `tenant_id` em todas as tabelas
- Índices compostos: `(tenant_id, created_at)`, `(tenant_id, staff_id)`
- Monitorizar com `pg_stat_statements`

### RISCO 7 — BAIXO: Onboarding multi-step sem persistência
**Problema:** Utilizador perde dados se fechar o browser durante onboarding  
**Mitigação:**
- Guardar progresso no `localStorage` com Zod parsing na leitura
- Ou criar tenant em draft no primeiro passo e atualizar nos seguintes

---

## 7. Ordem de Implementação

### FASE 0 — Fundação (sem esta fase nada funciona)
1. Configuração Supabase local + produção
2. Schema inicial: `tenants`, `tenant_members`, `users`
3. RLS policies base + testes de isolamento
4. Autenticação (login, register, logout, session refresh)
5. Middleware Next.js (auth guard + tenant resolution)
6. Geração de tipos TypeScript do Supabase
7. Layout base mobile-first (bottom nav + sidebar desktop)

### FASE 1 — Core do negócio
1. Onboarding do tenant (nome, slug, categoria, configurações)
2. CRUD de Serviços (nome, duração, preço, cor)
3. CRUD de Profissionais (nome, foto, bio)
4. Configuração de horários (disponibilidade por dia da semana)
5. Gestão de Clientes (ficha, histórico)

### FASE 2 — Agenda
1. Vista calendário (dia + semana em mobile, mês em desktop)
2. Criação manual de agendamento (staff)
3. Edição e cancelamento
4. Validação de conflitos com lock otimista
5. Notificações Realtime entre múltiplos tabs/utilizadores

### FASE 3 — Portal de Booking Público
1. Página pública `/booking/[tenant]`
2. Fluxo: serviço → profissional → data → horário → dados → confirmação
3. Email de confirmação (Resend / Supabase Edge Functions)
4. Página de gestão de marcação pelo cliente (cancelar / reagendar)

### FASE 4 — Simulador WhatsApp
1. Definição dos tipos `WhatsAppWebhookPayload` (estrutura real Meta API)
2. Endpoint `/api/webhooks/whatsapp` com validação de payload
3. Interface de simulador (duas bolhas de conversa, como WhatsApp)
4. Motor de conversação básico (keywords → respostas predefinidas)
5. Ligação ao sistema de disponibilidade (leitura apenas)
6. Fluxo completo: cliente pede horário → IA propõe → cliente confirma → sistema agenda

### FASE 5 — IA Real + WhatsApp Real
1. Integração com Evolution API ou Twilio para WhatsApp real
2. Integração com Claude API (claude-haiku-4-5 para velocidade/custo)
3. Substituição do motor de keywords por LLM com contexto do negócio
4. A fronteira IA/sistema permanece igual — zero refactor na lógica

### FASE 6 — Multi-nicho
1. Abstração de `business_type` no schema (`estetica | veterinaria | barbearia | ...`)
2. Templates de serviços por nicho
3. Campos específicos por nicho (ex: espécie do animal em veterinária)
4. Onboarding personalizado por tipo de negócio

---

## 8. Decisões de Arquitetura e Justificações

### Por que path-based em vez de subdomains no MVP
Muitos projetos SaaS falham aqui. Subdomains exigem wildcard DNS, configuração especial no Vercel/Cloudflare, e `next/headers` tem comportamento diferente. Path-based resolve o mesmo problema com zero complexidade adicional. A migração para subdomains é feita uma vez, depois do MVP validado.

### Por que Server Actions em vez de API Routes para mutações
Server Actions são colocalizadas com o componente, têm tipagem ponta-a-ponta automática, e validam no servidor sem boilerplate. API Routes ficam apenas para webhooks externos (WhatsApp, pagamentos) que precisam de endpoint público.

### Por que separar services/ de lib/supabase/
Muitos projetos Next.js colocam queries Supabase diretamente nos Server Components. Isso torna os testes impossíveis e mistura responsabilidades. Os `services` contêm lógica de negócio pura; `lib/supabase` contém apenas instância do cliente.

### Por que definir a fronteira da IA agora
É tentador deixar para depois. Se não for definida na arquitetura, alguém vai chamar `INSERT` de dentro da camada de IA. Isso cria um sistema imprevisível onde a IA pode criar marcações fantasma. A regra é simples e inegociável:

> **A IA só chama `availability.service.getAvailableSlots()` — nunca `appointment.service.create()`**

---

## Resumo Executivo

| Decisão | Escolha | Motivo |
|---|---|---|
| Multi-tenancy | RLS no PostgreSQL | Custo baixo, nativo no Supabase, seguro |
| Routing de tenant | Path-based (MVP) | Zero complexidade DNS no início |
| Renderização | Server Components + TanStack Query | Performance + SEO + cache |
| Formulários | React Hook Form + Zod | Validação dual, tipagem end-to-end |
| IA | Camada READ-ONLY | Segurança, previsibilidade, confiança |
| WhatsApp | Simulador com payload real | Migração zero-cost para WhatsApp real |
| Mobile | Bottom nav + bottom sheets | UX nativa para utilizadores mobile |

---

*Documento gerado em 09/06/2026 — ExodoFlow AI v1.0*
