# FASE 2 — DESIGN SYSTEM + LAYOUT MOBILE-FIRST
## Plano Técnico Completo do ExodoFlow AI

**Data:** 09 de Junho de 2026  
**Versão:** 1.0  
**Status:** Awaiting Approval  

---

## 1. Visão Geral

Criar a fundação visual profissional do SaaS com **mobile-first absoluto**. Sem Supabase real, WhatsApp real, IA real — apenas mock data.

**Objetivo:** Interface responsiva, funcional e pronta para integração de backend na Fase 3.

---

## 2. Arquitectura de Pastas

```
exodoflow/
├── src/
│   ├── app/
│   │   ├── (marketing)/                    # Landing page pública
│   │   │   └── page.tsx
│   │   ├── (dashboard)/                    # Área autenticada (será mockada por enquanto)
│   │   │   ├── layout.tsx                  # Layout principal com nav
│   │   │   ├── page.tsx                    # Dashboard
│   │   │   ├── agenda/page.tsx
│   │   │   ├── clientes/page.tsx
│   │   │   ├── servicos/page.tsx
│   │   │   ├── recursos/page.tsx
│   │   │   ├── conversas/page.tsx          # WhatsApp simulator
│   │   │   ├── configuracoes/page.tsx
│   │   │   └── templates/page.tsx          # Templates de nicho
│   │   └── layout.tsx                      # Root layout
│   │
│   ├── components/
│   │   ├── ui/                             # Shadcn/UI base (gerado)
│   │   ├── design-system/                  # Componentes customizados
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Card/
│   │   │   ├── Badge/
│   │   │   ├── Modal/
│   │   │   ├── Drawer/
│   │   │   ├── BottomSheet/
│   │   │   ├── EmptyState/
│   │   │   ├── LoadingState/
│   │   │   ├── ErrorState/
│   │   │   ├── PageHeader/
│   │   │   ├── SectionHeader/
│   │   │   ├── StatCard/
│   │   │   ├── MobileCardList/
│   │   │   └── DataTableWrapper/
│   │   │
│   │   ├── layout/                         # Componentes de layout
│   │   │   ├── BottomNav/                  # Navegação mobile fixa
│   │   │   ├── SidebarMobile/              # Sidebar compacto (tablet)
│   │   │   ├── SidebarDesktop/             # Sidebar completo (desktop)
│   │   │   ├── Header/
│   │   │   └── Footer/
│   │   │
│   │   └── features/                       # Componentes por feature
│   │       ├── dashboard/
│   │       ├── agenda/
│   │       ├── clientes/
│   │       ├── servicos/
│   │       ├── recursos/
│   │       ├── whatsapp-simulator/
│   │       └── configuracoes/
│   │
│   ├── lib/
│   │   ├── mock-data/                      # Mock data generators
│   │   │   ├── tenants.ts
│   │   │   ├── bookings.ts
│   │   │   ├── clients.ts
│   │   │   ├── services.ts
│   │   │   ├── resources.ts
│   │   │   └── conversations.ts
│   │   └── utils/
│   │       ├── responsive.ts               # Helpers para breakpoints
│   │       └── formatting.ts               # Formatação de datas, valores
│   │
│   ├── hooks/
│   │   ├── use-responsive.ts               # Detectar device (mobile/tablet/desktop)
│   │   └── use-mock-data.ts                # Hook para carregar mock data
│   │
│   └── types/
│       ├── index.ts                        # Tipos globais (spelhando DB schema)
│       └── mock.ts                         # Tipos específicos de mock
│
├── public/
│   ├── icons/                              # SVG icons para nav
│   └── images/
│
└── tailwind.config.ts                      # Configuração de breakpoints mobile-first
```

---

## 3. Configuração de Breakpoints (Mobile-First)

```typescript
// tailwind.config.ts
export default {
  theme: {
    screens: {
      // Base: mobile (360px)
      'sm': '390px',   // iPhone 12/13 Pro
      'md': '640px',   // Tablet pequeno
      'lg': '1024px',  // Tablet grande
      'xl': '1280px',  // Desktop
    },
    extend: {
      spacing: {
        'safe': 'max(1rem, env(safe-area-inset-bottom))', // iPhone notch
      },
    },
  },
};
```

**Regra:** Escrever CSS para mobile (360px) primeiro, depois adicionar `sm:`, `md:`, `lg:` para telas maiores.

---

## 4. Design System — Componentes (Ordem de Criação)

### Fase 4.1 — Base Primitivos (Dia 1)

| # | Componente | Props | Uso |
|---|---|---|---|
| 1 | Button | size, variant, disabled | Botões em toda a app |
| 2 | Input | label, error, placeholder | Formulários |
| 3 | Textarea | label, error | Descrições longas |
| 4 | Select | label, options, error | Dropdowns |
| 5 | Card | children, padding | Containers |
| 6 | Badge | variant, size | Etiquetas de status |

**Exemplo Button:**
```typescript
// components/design-system/Button/Button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';  // Mínimo 44px em mobile (Apple HIG)
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
}

export function Button({ size = 'md', variant = 'primary', fullWidth, ...props }: ButtonProps) {
  const sizeClasses = {
    sm: 'h-10 px-3 text-sm',
    md: 'h-12 px-4 text-base',      // 48px recomendado
    lg: 'h-14 px-5 text-lg',
  };
  
  return (
    <button
      className={`
        rounded-lg font-medium transition-colors
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${variant === 'primary' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
      `}
      {...props}
    />
  );
}
```

### Fase 4.2 — Containers & Layout (Dia 1-2)

| # | Componente | Props | Uso |
|---|---|---|---|
| 7 | Modal | isOpen, onClose, title, children | Diálogos |
| 8 | Drawer | isOpen, onClose, side, children | Menu lateral mobile |
| 9 | BottomSheet | isOpen, onClose, children | Ações mobile |
| 10 | PageHeader | title, description, action | Cabeçalhos de página |
| 11 | SectionHeader | title, action | Cabeçalhos de secção |

### Fase 4.3 — Estado e Feedback (Dia 2)

| # | Componente | Props | Uso |
|---|---|---|---|
| 12 | EmptyState | icon, title, description, action | Listas vazias |
| 13 | LoadingState | message | Carregamento |
| 14 | ErrorState | title, message, action | Erros |
| 15 | StatCard | label, value, trend, icon | KPIs |

### Fase 4.4 — Data Display (Dia 2-3)

| # | Componente | Props | Uso |
|---|---|---|---|
| 16 | MobileCardList | items, renderCard | Listas em mobile |
| 17 | DataTableWrapper | columns, data, responsive | Tabelas desktop/mobile |

---

## 5. Layout Principal

### 5.1 Mobile (360px - 430px)

```
┌─────────────────────┐
│  Page Header        │
├─────────────────────┤
│                     │
│  Main Content       │
│  (scrollable)       │
│                     │
├─────────────────────┤
│ 🏠 Agenda Chat ⚙️  │  ← BottomNav fixa (safe-area no iPhone)
└─────────────────────┘
```

**Regras:**
- BottomNav fixa com 5 abas: Início, Agenda, Clientes, Chat, Menu
- Ícones claros, rótulo curto (1 palavra)
- Área de toque: 60px × 60px mínimo
- Respeitar `safe-area-inset-bottom` no iPhone X+
- Sem scroll horizontal

### 5.2 Tablet (640px - 1024px)

```
┌──────────────────────────────────────┐
│        Header / Logo                 │
├──────────┬──────────────────────────┤
│          │                          │
│ Sidebar  │   Main Content           │
│ (compact)│   (scrollable)           │
│          │                          │
│          │                          │
└──────────┴──────────────────────────┘
```

**Regras:**
- Sidebar esquerdo compacto (~80px de largura)
- Ícones apenas (sem rótulos)
- Menu hambúrguer para expandir
- Main content ocupa o resto

### 5.3 Desktop (1280px+)

```
┌─────────────────────────────────────────────┐
│              Header / Logo                  │
├──────────────┬─────────────────────────────┤
│              │                             │
│ Sidebar      │                             │
│ (completo)   │   Main Content              │
│              │                             │
│ • Dashboard  │   (scrollable)              │
│ • Agenda     │                             │
│ • Clientes   │                             │
│ • Serviços   │                             │
│ • Recursos   │                             │
│ • Conversas  │                             │
│ • Config     │                             │
│              │                             │
└──────────────┴─────────────────────────────┘
```

**Regras:**
- Sidebar fixo completo (~250px)
- Ícones + rótulos
- Submenu expansível
- Main content scrollable

---

## 6. Mock Data Structure

Todos os tipos espelham o schema PostgreSQL da Fase 0:

```typescript
// lib/mock-data/tenants.ts
export const MOCK_TENANT = {
  id: 'b1000000-0000-0000-0000-000000000001',
  name: 'Clínica Estética Aurora',
  slug: 'clinica-aurora',
  business_type: 'estetica',
  plan: 'starter',
  settings: {
    timezone: 'Europe/Lisbon',
    currency: 'EUR',
    slot_interval_minutes: 15,
  },
};

// lib/mock-data/bookings.ts
export const MOCK_BOOKINGS = [
  {
    id: 'f1000000-0000-0000-0000-000000000001',
    tenant_id: MOCK_TENANT.id,
    client_id: 'e1000000-0000-0000-0000-000000000001',
    service_id: 'c1000000-0000-0000-0000-000000000001',
    start_at: new Date('2026-06-09T10:00:00+01:00'),
    end_at: new Date('2026-06-09T11:00:00+01:00'),
    status: 'confirmed',
    price_charged: 45.00,
  },
  // ... mais bookings
];

// lib/mock-data/clients.ts
export const MOCK_CLIENTS = [
  {
    id: 'e1000000-0000-0000-0000-000000000001',
    tenant_id: MOCK_TENANT.id,
    full_name: 'Maria Oliveira',
    phone: '+351921111111',
    email: 'maria@email.pt',
    nif: '123456789',
    gdpr_consent_at: new Date(),
  },
  // ... mais clientes
];
```

---

## 7. Páginas Mockadas (Ordem de Criação)

### 7.1 Landing Page
- Hero section com CTA
- 3 features principais
- Pricing cards (6 nichos)
- Footer

### 7.2 Dashboard
- Cards: Agendamentos hoje, Clientes novos, Receita, Mensagens
- Gráfico simples (barras) de agendamentos da semana
- Próximas marcações (5 últimas)

### 7.3 Agenda
**Mobile:**
- Filtro: Hoje/Semana/Mês (Pills)
- Cards por agendamento (cliente, serviço, hora, status)
- Botão flutuante: "+ Novo Agendamento"

**Desktop:**
- Visão mensal com calendário simples
- Tabela de agendamentos da semana
- Filtros: Data, Profissional, Status

### 7.4 Clientes
**Mobile:**
- Cards: Nome, Telefone, Última visita
- Filtro por busca
- Botão "+ Novo Cliente"

**Desktop:**
- Tabela: Nome, Telefone, Email, NIF, Consentimento, Última Visita
- Paginação
- Busca

### 7.5 Serviços
- CRUD visual (Create, Read, Update, Delete)
- Campos: Nome, Duração (minutos), Preço, Ativo/Inativo
- Card/tabela conforme device

### 7.6 Recursos
- CRUD visual
- Campos: Nome, Tipo (Staff/Room/Equipment), Especialidade, Ativo/Inativo
- Comentário: "Resource é genérico para permitir múltiplos nichos"

### 7.7 Conversas (WhatsApp Simulator)
- Inbox com lista de conversas
- Detalhes da conversa com bubble chat (mock messages apenas)
- Input para digitar (visual apenas, sem envio real)
- Sem IA, sem Meta API

### 7.8 Configurações
- Secção: Dados da Empresa (nome, email, telefone)
- Secção: Plano (badge + upgrade CTA)
- Secção: Horários (editar dias da semana + horas)
- Secção: Aparência (tema claro/escuro)

### 7.9 Templates de Nicho
- 6 cards: Estética, Veterinária, Barbearia, Dentista, Oficina, Fisioterapia
- Cada card: ícone + nome + "Ver template"
- Ao clicar: preview de campos customizados

---

## 8. Dependências a Instalar

```bash
npm install \
  react-hook-form \
  zod \
  @hookform/resolvers \
  @tanstack/react-query \
  date-fns \
  lucide-react \
  clsx \
  tailwind-merge
```

**Shadcn/UI** será instalado com:
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input card badge
```

---

## 9. Decisões de Design

| Decisão | Motivo | Implementação |
|---|---|---|
| Bottom Nav no mobile | Mais acessível para o polegar | 5 abas, safe-area no iPhone |
| Cards em mobile, Tabelas em desktop | Mobile não suporta scroll horizontal | MobileCardList vs DataTable |
| Inputs 48px em mobile | Apple HIG + evita zoom automático | size 16px base |
| Sem dark mode v1 | Scope reduzido, fácil de adicionar depois | Tema claro apenas |
| Cores do Tailwind padrão | Profissional, coerente, sem brand custom | bg-blue-600, text-gray-900 |
| Mock data imutável | Sem state management complex | Static imports |

---

## 10. Fluxo de Implementação

```
DIA 1 (6h)
├── Setup inicial
│   ├── Instalar dependências
│   ├── Configurar Tailwind breakpoints
│   └── Setup Shadcn/UI
├── Design System Fase 1
│   ├── Button, Input, Card, Badge
│   ├── Tests: sizes, variants, responsive
│   └── Storybook mental (imaginar em 360px, 1280px)
└── Layout base
    ├── BottomNav (mobile)
    ├── SidebarDesktop (1280px)
    └── Middleware: detectar device

DIA 2 (6h)
├── Design System Fase 2-3
│   ├── Modal, Drawer, BottomSheet
│   ├── EmptyState, LoadingState, ErrorState
│   └── PageHeader, SectionHeader, StatCard
├── Layout tablet
│   └── SidebarMobile compacto
└── Mock data setup
    └── Generators para todos os tipos

DIA 3 (8h)
├── Páginas
│   ├── Landing Page
│   ├── Dashboard
│   ├── Agenda (mobile + desktop)
│   ├── Clientes
│   ├── Serviços
│   ├── Recursos
│   ├── Conversas (WhatsApp Simulator)
│   ├── Configurações
│   └── Templates
└── QA
    ├── Responsividade (360px, 390px, 430px, 768px, 1024px, 1280px)
    ├── Sem scroll horizontal
    ├── Touch targets 44px+
    ├── Build sem erros
    └── Lint/format

TOTAL: ~20 horas de implementação
```

---

## 11. Qualidade Obrigatória

Antes de marcar como "feito":

```bash
# Lint
npm run lint

# Build
npm run build

# Type check
npx tsc --noEmit

# Responsividade manual (6 breakpoints):
# - 360px (iPhone SE)
# - 390px (iPhone 12)
# - 430px (iPhone 15)
# - 768px (iPad)
# - 1024px (iPad Pro)
# - 1280px (Desktop)
```

---

## 12. Riscos Restantes

| Risco | Nível | Mitigation |
|---|---|---|
| Componentes muito grandes | 🟡 MÉDIO | Break em units de 1-2 responsabilidades |
| Mock data divergir do schema real | 🟡 MÉDIO | Tipos TypeScript + comentários |
| Performance do Tailwind | 🟢 BAIXO | Purge config correcto, build otimizado |
| Diferentes browsers (Safari iPhone) | 🟡 MÉDIO | Test em real device ou BrowserStack |
| Form validation sem backend | 🟢 BAIXO | Zod client-side, preparar para Server Actions depois |

---

## 13. Próximos Passos (Fase 3)

Quando Fase 2 estiver pronta:
1. Integrar Supabase real (substituir mock data)
2. Server Actions para formulários
3. Real-time com Realtime API do Supabase
4. Autenticação real (Supabase Auth)

---

## Checklist de Aprovação

- [ ] Arquitectura de pastas validada?
- [ ] Breakpoints mobile-first OK?
- [ ] Componentes Design System alinhados?
- [ ] Páginas cover as features necessárias?
- [ ] Mock data strategy clara?
- [ ] Timeline (20h) realista para o projeto?

**Aprovação:** CTO + Product Owner

---

*Plano criado em 09/06/2026 — Fase 2 ExodoFlow AI*
