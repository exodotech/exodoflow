# Accessibility Standards

**Estado:** Ativo · **Owner:** Frontend Guild · **Norma:** WCAG 2.2 nível **AA** (mínimo obrigatório)
**Contexto legal:** European Accessibility Act (aplicável desde junho 2025) — conformidade não é opcional
**Última revisão:** 2026-06

## Requisitos obrigatórios

### 1. Teclado
- Toda a funcionalidade operável só com teclado (Tab, Shift+Tab, Enter, Espaço, setas, Esc).
- Ordem de foco lógica e visível: indicador de foco com contraste ≥ 3:1 e nunca `outline: none` sem substituto.
- Sem armadilhas de foco; modais prendem o foco enquanto abertos e devolvem-no ao elemento de origem ao fechar.
- Skip link ("Saltar para o conteúdo") como primeiro elemento focável.

### 2. Contraste
- Texto normal: **≥ 4.5:1**. Texto grande (≥ 24px ou ≥ 18.5px bold): **≥ 3:1**.
- Componentes de UI e estados (bordas de inputs, ícones funcionais, foco): **≥ 3:1**.
- Cor nunca é o único meio de transmitir informação (erros têm ícone + texto, não só vermelho).
- Tokens de cor do design system já validados; cores fora dos tokens exigem validação manual no PR.

### 3. Semântica e labels
- HTML semântico primeiro; ARIA só quando não existe elemento nativo (`<button>`, não `<div role="button">`).
- Todo o input tem `<label>` associado (placeholder não é label).
- Imagens informativas têm `alt` descritivo; decorativas têm `alt=""`.
- Hierarquia de headings sem saltos (h1 → h2 → h3); um único `h1` por página.
- Idioma declarado (`<html lang="pt">`) e em mudanças de idioma inline.

### 4. Screen readers
- Conteúdo dinâmico anunciado via `aria-live` (`polite` para atualizações, `assertive` só para erros críticos).
- Nomes acessíveis em todos os controlos interativos (`aria-label` quando não há texto visível).
- Tabelas de dados com `<th>` e `scope`; nunca tabelas para layout.

### 5. Estados e interação
- Estados de erro: mensagem associada ao campo via `aria-describedby` + `aria-invalid="true"`.
- Loading: `aria-busy` ou live region; nunca apenas spinner visual.
- Componentes expansíveis: `aria-expanded`; seleção: `aria-selected`/`aria-checked`.
- Alvos de toque ≥ **24×24 px** (WCAG 2.2 — 44×44 recomendado em mobile).
- Animações respeitam `prefers-reduced-motion`.

## Enforcement (Definition of Done inclui acessibilidade)

| Camada | Ferramenta | Gate |
|---|---|---|
| Lint | `eslint-plugin-jsx-a11y` (modo strict) | Build falha |
| Testes automáticos | axe-core nos testes de componentes e E2E | Build falha em violações *serious/critical* |
| Review | Checklist de acessibilidade no template de PR para mudanças de UI | Reviewer bloqueia |
| Manual | Teste com teclado + screen reader (NVDA ou VoiceOver) em features novas de UI | Antes do release |
| Auditoria | Auditoria externa anual WCAG 2.2 AA | Findings = backlog priorizado |

## Exceções

Não há exceções permanentes. Exceções temporárias exigem issue com prazo e aprovação do tech lead de frontend.
