# ExodoFlow AI — Checklist de QA Mobile

> O produto é **mobile-first**. Esta checklist valida cada rota nas larguras-alvo.
> Usar as DevTools (modo dispositivo) ou dispositivos reais.

## Larguras-alvo

| Perfil | Largura | Notas |
|---|---|---|
| Telemóvel pequeno | **360px** | Android base / iPhone SE |
| Telemóvel comum | **390px** | iPhone 12–15 |
| Telemóvel grande | **430px** | iPhone Pro Max |
| Tablet | **768–1024px** | iPad (sidebar tablet) |
| Desktop | **≥1280px** | sidebar completa |

## Critérios por ecrã (todos têm de passar)

- [ ] **Sem scroll horizontal** (nada "vaza" para fora do ecrã).
- [ ] **Botões visíveis e tocáveis** (alvo ≥ 40px, não cortados).
- [ ] **Modais cabem** no ecrã e fazem scroll interno se preciso (não cortam o rodapé/ações).
- [ ] **Inputs confortáveis** (altura ≥ 44px, sem zoom indesejado no iOS).
- [ ] **Logout acessível** (sidebar/menu) em qualquer breakpoint.
- [ ] **Menu/navegação acessível** (sidebar desktop, sidebar tablet, bottom-nav mobile).
- [ ] Texto legível (sem overflow/ellipsis a esconder informação crítica).

## Rotas a testar (× cada largura)

### Públicas (não autenticado)
- [ ] `/login` — campos, link "Esqueceu a palavra-passe?", botão.
- [ ] `/forgot-password` — input e-mail, mensagem neutra de sucesso.
- [ ] `/reset-password` — dois campos de senha, estados (a validar/inválido/sucesso).

### Dashboard (autenticado)
- [ ] `/dashboard` — cards de métricas, cabeçalho sempre visível.
- [ ] `/dashboard/agenda` — lista + modal "Nova Marcação" (4 passos cabem no ecrã).
- [ ] `/dashboard/clientes` — lista/cards, filtros (Todos/Clientes/Visitantes), botões.
- [ ] `/dashboard/clientes/[id]` *(modal de detalhe)* — secções (dados/consentimentos/marcações/notas/comunicação) com scroll interno.
- [ ] `/dashboard/servicos` — CRUD + modais.
- [ ] `/dashboard/recursos` — CRUD + disponibilidade.
- [ ] `/dashboard/equipa` — lista de membros, modal de função, criar membro.
- [ ] `/dashboard/configuracoes` — separadores com scroll horizontal controlado (incl. **WhatsApp**).
- [ ] `/dashboard/auditoria` — cards (mobile) / tabela (desktop), filtros.
- [ ] `/dashboard/sistema` — cards de saúde + estado do Sentry.
- [ ] `/dashboard/perfil` — dados pessoais + **alterar palavra-passe**.

### Admin (superadmin)
- [ ] `/admin` — visão geral + atalhos.
- [ ] `/admin/empresas` — lista com owner/contagens, modais de suspender/reactivar.
- [ ] `/admin/utilizadores` — owners (cards mobile / tabela desktop).
- [ ] `/admin/sistema` — métricas + auditoria de sistema.

## Notas de regressão conhecidas (já resolvidas — confirmar que se mantêm)

- Cabeçalho (`PageHeader`) aparece **sempre**; loading/erro são inline (a página nunca fica em branco).
- Logótipos usam `<img>` resiliente (URL inválida esconde a imagem, não derruba a página).
- Datas dos simuladores têm `timeZone` fixo (sem erro de hidratação).
