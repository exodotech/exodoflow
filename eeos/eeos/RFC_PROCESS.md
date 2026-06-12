# RFC Process

**Estado:** Ativo · **Owner:** CTO · **Repositório:** `rfcs/` (um ficheiro markdown por RFC)
**Última revisão:** 2026-06

## Quando é obrigatória uma RFC

Qualquer mudança que cumpra **um ou mais** destes critérios:

- Breaking change em API pública ou contrato entre serviços.
- Nova dependência de infraestrutura (base de dados, fila, fornecedor cloud, modelo de IA externo).
- Alteração ao modelo de dados que afete mais de um serviço.
- Mudança com impacto em segurança, privacidade ou retenção de dados.
- Custo recorrente estimado > €500/mês ou esforço > 2 semanas-pessoa.
- Alteração a este processo ou a qualquer política do EEOS.

Mudanças fora destes critérios: PR normal, sem RFC. Na dúvida, perguntar no canal `#eng-rfcs` — resposta de um tech lead em 24h.

## Fluxo e prazos

```
Draft → Discussão (5-10 dias úteis) → Revisão final (2 dias) → Decisão → ADR → Implementação
```

1. **Draft** — autor copia `rfcs/0000-template.md`, abre PR. Numeração atribuída no merge.
2. **Discussão** — mínimo **5 dias úteis**, máximo 10. Comentários no PR. Autor atualiza o documento; desacordos não resolvidos vão para a secção "Unresolved questions".
3. **Revisão final** — autor declara "final comment period" (2 dias úteis). Sem objeções bloqueantes novas → segue para decisão.
4. **Decisão** — quem aprova:
   - Impacto num só domínio → **tech lead do domínio**.
   - Impacto multi-domínio, segurança, custo > €2.000/mês → **CTO**.
   - Resultados possíveis: `Accepted`, `Rejected`, `Postponed` (com motivo escrito).
5. **ADR** — toda a RFC aceite gera um ADR em `adrs/` (decisão, contexto, consequências, alternativas rejeitadas). O ADR é imutável; reversões geram novo ADR que o substitui.
6. **Implementação** — issues criadas com referência `RFC-NNN`. Commits relevantes referenciam a RFC no rodapé.

## Template (secções obrigatórias)

```markdown
# RFC-NNNN: Título

- Estado: Draft | In Review | Accepted | Rejected | Postponed
- Autor(es) / Decisor / Datas

## Problema           — que problema resolve, porquê agora
## Proposta           — desenho da solução, diagramas
## Alternativas       — opções consideradas e porque foram rejeitadas
## Impacto            — segurança, privacidade, custos, migração, rollback
## Plano de rollout   — fases, feature flags, critérios de sucesso
## Unresolved questions
```

## Regras

- RFC sem atividade durante 30 dias é marcada `Postponed` automaticamente.
- Rejeição exige justificação escrita — "não" sem motivo não é decisão.
- RFCs são públicas internamente; qualquer engenheiro pode comentar.
