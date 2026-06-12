# ExodoFlow AI — Manual de Funcionalidades, Acessos e Testes

> Documento de referência do estado atual do produto.
> Última atualização: fase de estabilização (auth/logout/páginas) concluída.
> SaaS multi-tenant de agenda + automação para clínicas, barbearias e afins (PT/BR).

---

## 1. Como arrancar a aplicação

**Pré-requisitos:** Docker Desktop a correr + Node 20.

```bash
# 1) Base de dados local (Supabase) — na raiz do projeto
npx supabase start            # arranca os containers
npx supabase migration up     # aplica as migrations pendentes (NÃO destrói dados)

# 2) Aplicação Next.js — na pasta exodoflow/
cd exodoflow
npm install
npm run dev                   # http://localhost:3000
```

> ✅ **Fluxo normal = `npx supabase migration up`.** É incremental e preserva utilizadores, sessões, onboarding, branding e marcações. Para criar uma nova alteração de schema, adicione um ficheiro de migração numerado em `supabase/migrations/` e volte a correr `migration up`.
>
> 🚫 **`npx supabase db reset` é DESTRUTIVO** — apaga TODA a base local (auth, sessões, onboarding, branding, marcações, consentimentos). **A partir da fase de hardening, não usar sem autorização explícita.** Só faz sentido num ambiente vazio/descartável para semear dados de teste pela primeira vez — nunca com sessões abertas no browser nem num ambiente com dados reais.

**Nota de desempenho (dev):** em `npm run dev`, a **primeira** visita a cada página compila on-demand (Turbopack) e demora alguns segundos — é normal. Em produção (`npm run build && npm start`) as páginas carregam de imediato.

---

## 2. Dados de acesso (ambiente local)

| Perfil | E-mail | Palavra-passe | Acede a |
|---|---|---|---|
| **Proprietário (Owner)** | `owner@clinica-aurora.pt` | `test1234` | Tudo do tenant |
| **Gestor (Manager)** | `manager@clinica-aurora.pt` | `test1234` | Tudo menos billing e gestão da equipa |
| **Administrador do Sistema (Superadmin)** | `admin@exodoflow.pt` | `admin12345` | Só o painel `/admin` |

**Empresas de teste (tenants):**
- **Clínica Estética Aurora** (Portugal, EUR) — tenant principal, com serviços/recursos/clientes/1 marcação.
- **Barbearia Central** (Portugal) — 2.º tenant, só para provar o isolamento (um tenant nunca vê os dados do outro).

> Não há registo público. Novas contas são criadas pelo Superadmin (painel `/admin`).

---

## 3. O que o site faz (funcionalidades por área)

### 3.1 Autenticação e acesso
- **Login** (`/login`) com e-mail/palavra-passe.
- **Registo público desativado** — `/register` é informativa ("acesso por convite").
- **Logout à prova de bala** — limpa sessão local, expira cookies e redireciona sempre para `/login`, mesmo com sessão corrompida.
- **Sessão inválida não crasha** — o middleware e o layout redirecionam para login em vez de partir.

### 3.2 Multi-tenant + Segurança (RLS)
- Cada empresa (tenant) só vê os seus próprios dados — garantido por Row Level Security na base de dados.
- **Papéis:** `superadmin`, `owner`, `manager`, `receptionist`, `staff` — cada um com permissões próprias (RBAC).
- Proteções: não se pode escalar a própria função; não se pode suspender/remover o único proprietário.

### 3.3 Onboarding (primeiro acesso de um owner)
- Fluxo guiado de 7 passos: empresa → nicho → 1.º serviço → 1.º recurso → horários → equipa → resumo.
- **País e nicho são definidos na criação da empresa (superadmin)** e aparecem **só leitura** no onboarding (com cadeado). Determinam moeda, idioma e fuso. O owner preenche o resto (nome, slug, serviços, recursos, horários).

### 3.4 Dashboard (`/dashboard`)
- Visão geral com dados reais: **receita (30 dias)**, **marcações de hoje**, **nº de clientes**, próximas marcações.
- Cabeçalho aparece sempre; o corpo mostra loading/erro/dados (não fica em branco se uma query demorar).

### 3.5 Agenda (`/dashboard/agenda`)
- Lista de marcações com filtros por estado.
- **Nova marcação** (assistente em 4 passos: cliente → serviço → data/recurso → horário disponível).
- **Reagendar** e **cancelar** marcações.
- Motor de marcações **atómico e anti-duplo-agendamento** (RPC `create_booking` na base de dados): dois utilizadores não conseguem reservar o mesmo recurso/hora.
- Slots calculados pela disponibilidade do recurso (RPC `get_available_slots`), respeitando o fuso horário.

### 3.6 Clientes (`/dashboard/clientes`)
- Listar, pesquisar e filtrar por consentimento de marketing.
- **Criar / Editar / Apagar** (soft-delete — o histórico de marcações é preservado).
- **Detalhe do cliente** (clicar no nome): dados, **histórico de consentimento RGPD** e **marcações** do cliente.
- **Consentimento de marketing (RGPD/LGPD):** opcional, nunca bloqueia o cadastro, com nota a separar marketing de comunicações operacionais.
- **Trilho de consentimento imutável** — cada alteração de consentimento gera um registo que não pode ser apagado nem alterado (prova legal).

### 3.7 Serviços (`/dashboard/servicos`)
- **CRUD completo**: criar, editar (nome, duração, preço, cor, tipo de recurso), apagar (soft-delete).
- Item apagado sai da lista; marcações antigas continuam válidas.

### 3.8 Recursos (`/dashboard/recursos`)
- **CRUD completo** de colaboradores, salas e equipamentos.
- Soft-delete preserva o histórico.

### 3.9 Equipa (`/dashboard/equipa`) — só Owner gere
- Listar membros com função, estado, recurso associado, último acesso e data de criação.
- **Adicionar membro** (Gestor / Recepcionista / Colaborador) — credenciais geradas para entregar.
- Ao criar um **Colaborador (staff)**, pode-se vincular a um **recurso humano** (liga a agenda dele ao recurso).
- **Alterar função**, **suspender** e **reativar** membros.
- Proteção: não se pode suspender/despromover/remover o **único proprietário**.

### 3.10 Configurações (`/dashboard/configuracoes`)
- **Empresa** (editável pelo owner): nome, slug, e-mail, telefone, website, NIF/CPF, morada, cidade, código postal.
- **País e Nicho:** só leitura, com aviso *"Definido na criação da empresa. Para alterar, contacte o suporte."*
- **Branding:** logótipo + cor principal. Aplica-se a toda a interface (sidebar, botões, estados ativos) e **persiste após refresh**.
- **Localização, Comunicação, Plano, Integrações, Templates** (consulta).
- A edição da empresa **nunca apaga** o branding nem as configurações de comunicação (merge seguro).

### 3.11 A minha conta (`/dashboard/perfil`)
- Editar nome e telefone próprios.
- **Alterar palavra-passe** (útil quando um membro recebe uma palavra-passe temporária).

### 3.12 Administração do Sistema (`/admin`) — só Superadmin
- Listar todas as empresas.
- **Criar nova empresa** (cria o owner inicial via API segura — a chave de serviço nunca chega ao browser).
- **Suspender / reativar** empresa (a empresa suspensa é redirecionada para `/suspenso`).
- Definir o **plano** de cada empresa.

### 3.13 Conversas (`/dashboard/conversas`) — simulador
- Simulador de WhatsApp com dados de demonstração (sem integração real). Marcado honestamente como simulação.

### 3.14 Observabilidade e diagnóstico
- **`/api/health`** — verifica app + ligação à base de dados.
- **`/dev/diagnostics`** (só em desenvolvimento; **404 em produção**) — mostra o estado real de auth, perfil, tenant, RLS e cookies. Útil quando "algo não funciona".
- Camada de observabilidade pronta para Sentry (erros das páginas são reportados num ponto único).

---

## 4. Roteiro de testes (checklist manual)

> Faz numa **janela anónima** para garantir cookies limpos. Marca cada item.

### A) Login e Logout
- [ ] `/login` com `owner@clinica-aurora.pt` / `test1234` → entra no dashboard.
- [ ] Clicar **Sair** (sidebar) → vai para `/login`.
- [ ] Após sair, escrever `/dashboard` no URL → **continua em `/login`** (não reabre autenticado).
- [ ] Recarregar `/login` → fica em `/login`.

### B) Páginas abrem (com dados ou empty state honesto)
- [ ] `/dashboard` — mostra receita, marcações de hoje, clientes.
- [ ] `/dashboard/agenda` — lista de marcações + botão "Nova Marcação".
- [ ] `/dashboard/clientes` — lista de clientes.
- [ ] `/dashboard/servicos` — lista de serviços.
- [ ] `/dashboard/recursos` — lista de recursos.
- [ ] `/dashboard/conversas` — simulador de conversas.
- [ ] `/dashboard/configuracoes` — separadores Empresa/Branding/etc.

### C) Agenda — marcações
- [ ] "Nova Marcação" → escolher cliente, serviço, data, recurso e horário → criar.
- [ ] Tentar criar **outra marcação no mesmo recurso/hora** → é **bloqueada** (anti-duplo-agendamento).
- [ ] Reagendar uma marcação.
- [ ] Cancelar uma marcação.

### D) Clientes
- [ ] Criar cliente (reparar no texto do consentimento de marketing — desmarcado por omissão).
- [ ] Clicar no nome → ver **detalhe** (dados + consentimentos + marcações).
- [ ] Editar e Apagar (sai da lista).

### E) Serviços e Recursos
- [ ] Criar, editar e apagar um serviço.
- [ ] Criar, editar e apagar um recurso.

### F) Branding (Configurações → Branding)
- [ ] Mudar a **cor principal** → Guardar → a interface muda de cor **sem F5**.
- [ ] Recarregar a página → **a cor persiste**.
- [ ] Carregar um **logótipo** → aparece na sidebar; navegar pelas páginas → **não crasha**.

### G) Configurações — empresa
- [ ] Editar nome/telefone/morada → Guarda e persiste.
- [ ] Confirmar que **País e Nicho** estão bloqueados (cadeado + aviso).

### H) Equipa (como Owner)
- [ ] Adicionar um **Recepcionista** → copiar credenciais → login numa janela anónima.
- [ ] Adicionar um **Colaborador** e vincular a um recurso.
- [ ] Alterar a função de um membro.
- [ ] Suspender e reativar um membro.

### I) Perfil
- [ ] `/dashboard/perfil` → alterar nome.
- [ ] Alterar palavra-passe → sair → entrar com a nova palavra-passe.

### J) Superadmin (`admin@exodoflow.pt` / `admin12345`)
- [ ] `/admin` → ver lista de empresas.
- [ ] **Criar nova empresa** → login com o owner criado → vai para o onboarding.
- [ ] **Suspender** a Clínica Aurora → tentar entrar como owner → vê a página **conta suspensa**. Reativar.

### K) Permissões / Segurança
- [ ] Login como **Manager** → não vê gestão de equipa nem billing.
- [ ] Confirmar que um tenant não vê dados de outro (testado por RLS).

### L) Mobile (encolher para ~390px ou DevTools modo telemóvel)
- [ ] Aparece o **header mobile** (topo) com ícone de conta.
- [ ] BottomNav funciona; dashboard e agenda abrem; logout acessível pela conta.

---

## 5. Comandos de validação automática

Na pasta `exodoflow/` (exceto o auditor, que corre na raiz):

```bash
npm run lint     # ESLint — esperado: 0 erros (4 warnings conhecidos do React Hook Form)
npm test         # Vitest — esperado: 27 testes a passar
npm run build    # Next build — esperado: limpo
node ../audit-exodoflow-full.mjs   # Auditoria EEOS — esperado: 390/390
```

Prova de browser (Playwright, opcional) com o servidor a correr:
```bash
node repro-proof.mjs   # login + 7 páginas + logout completo
```

---

## 6. Estado atual (resumo)

| Componente | Estado |
|---|---|
| Autenticação + Logout | ✅ Funcional e blindado |
| Multi-tenant + RLS | ✅ Isolamento provado |
| Papéis / Permissões (RBAC) | ✅ |
| Onboarding (7 passos) | ✅ |
| Motor de marcações (atómico) | ✅ |
| Consentimento RGPD/LGPD (imutável) | ✅ |
| CRUD Clientes / Serviços / Recursos | ✅ |
| Branding (cor + logo, persistente) | ✅ |
| Configurações da empresa | ✅ |
| Gestão de equipa | ✅ |
| Perfil próprio + password | ✅ |
| Painel Superadmin (`/admin`) | ✅ |
| Observabilidade + diagnóstico | ✅ |
| Testes (Vitest) + CI + Auditor | ✅ 27 testes · 390 checks |

**Ainda NÃO implementado (intencional):** WhatsApp real, IA, SMS, billing, estoque.

---

## 7. Resolução de problemas

| Problema | Solução |
|---|---|
| Página parece "presa a carregar" em dev | É a compilação on-demand do Turbopack — aguardar uns segundos; em produção é imediato. |
| "Sessão inválida" / comportamento estranho | Abrir janela anónima, ou ir a `/dev/diagnostics` e clicar `forceLogout()`. |
| Logo não aparece / erro de imagem | Os logótipos usam `<img>` resiliente — uma URL inválida apenas se esconde, não derruba a página. |
| Migração nova não aplicou | Correr `npx supabase migration up` na raiz (incremental, não destrói dados). |

---

*ExodoFlow AI — documento gerado para acompanhamento do produto e dos testes.*
