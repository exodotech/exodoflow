# Política de Retenção de Dados — ExodoFlow Pro (rascunho técnico)

> Rascunho **técnico** de retenção. Os prazos finais dependem de obrigações legais
> (fiscais, de saúde), do contrato com cada tenant e de **revisão jurídica**.
> **Regra de ouro:** não apagar automaticamente dados críticos sem política
> aprovada e validação jurídica. Preferir **soft-delete/anonimização** a apagar.

## 1. Prazos sugeridos (a confirmar juridicamente)

| Categoria | Tabela(s) | Retenção sugerida | Mecanismo | Notas |
|---|---|---|---|---|
| Ficha de tratamento (saúde) | `treatment_records` | **Longa** — seguir prazo legal de registos de saúde do país | Manter; anonimizar ao remover cliente | Categoria sensível; **não** apagar por rotina. |
| Dados financeiros / recibos | `financial_transactions`, `receipts` | Prazo legal fiscal (ex.: vários anos) | Soft-delete + retenção legal | Obrigação contabilística. |
| Marcações | `bookings`, `booking_resources` | Média/longa (histórico clínico) | Soft-delete | Liga-se à ficha de tratamento. |
| Cliente | `clients`, `legal_consents` | Enquanto ativo + período legal | Soft-delete (0017) / anonimização | Consentimento guardado como prova. |
| Avaliações | `reviews` | Média (ex.: 12–24 meses) | Apagar ou anonimizar | Baixo valor a longo prazo. |
| Lista de espera | `waitlist` | **Curta** — limpar após encaixe/cancelamento | Apagar | Minimização de contactos. |
| Mensagens WhatsApp | `whatsapp_messages`, `whatsapp_conversations` | Curta/média | Apagar/arquivar | Pode conter texto livre sensível. |
| Contexto de IA | `ai_contexts` | Curta | Apagar | Efémero. |
| Logs de auditoria | `audit_logs`, `system_audit_logs` | **Longa** (segurança/forense) | Manter | Sem segredos/dados sensíveis. |
| Logs de localização | — | **N/A** | — | Produto não recolhe localização. |
| Fotos de evidência | — | **N/A** | — | Produto não recolhe fotos de pessoas. |
| Logo do tenant | Storage `tenant-logos` | Vida da conta | Apagar ao encerrar conta | Asset de marca. |
| Conta desativada (tenant) | `tenants` + dependentes | Período de carência + eliminação/anonimização | Processo manual aprovado | Definir no contrato/DPA. |
| Convites de equipa | `team_invites` | Curta (expiram) | Apagar expirados | Contêm email. |

## 2. Campos de retenção por tenant (roadmap)

Para tornar a retenção configurável por tenant (futuro), prever em
`tenants.settings` (ou colunas dedicadas):

- `retention_reviews_days`
- `retention_waitlist_days`
- `retention_whatsapp_days`
- `retention_audit_days` (com mínimo de segurança)
- `retention_treatment_days` (**sujeito a mínimo legal de saúde** — não reduzir sem base)

> Implementação sugerida: tarefa agendada (cron/Edge Function) que **anonimiza**
> ou soft-delete conforme a política aprovada, **nunca** apagando recibos/fichas
> dentro do prazo legal.

## 3. Princípios

- **Soft-delete primeiro:** preservar histórico e integridade referencial.
- **Anonimizar > apagar** quando há valor estatístico mas o titular pediu remoção.
- **Exceções legais prevalecem:** retenção fiscal/saúde sobrepõe-se a pedidos de
  apagamento (documentar a recusa parcial ao titular).
- **Auditar** qualquer rotina de eliminação.
