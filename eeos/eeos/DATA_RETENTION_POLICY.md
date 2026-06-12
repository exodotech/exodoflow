# Data Retention Policy

**Estado:** Ativo · **Owner:** CTO + DPO · **Base legal:** RGPD (UE 2016/679), Lei 58/2019 (PT)
**Última revisão:** 2026-06 · **Revisão obrigatória:** anual

## Princípios

1. **Minimização:** só retemos o que tem finalidade definida e base legal.
2. **Prazos explícitos:** nenhuma categoria de dados existe sem prazo e mecanismo de eliminação automática.
3. **Eliminação verificável:** a eliminação é executada por jobs automáticos, com log de auditoria da própria eliminação.

## Tabela de retenção

| Categoria | Retenção | Armazenamento | Eliminação | Justificação |
|---|---|---|---|---|
| Logs de aplicação | **30 dias** (hot) + 90 dias (cold, agregado) | Plataforma de observabilidade | Automática (TTL) | Debugging operacional |
| Logs de acesso/auditoria (auth, permissões, ações administrativas) | **7 anos** | Storage imutável (WORM) | Automática | Obrigações legais e forenses |
| Backups de base de dados | **35 dias** (point-in-time) + snapshot mensal 12 meses | Encriptado, região UE | Automática | Ver RPO/RTO abaixo |
| Dados de clientes (tenant ativo) | Duração do contrato | BD primária, região UE | — | Execução do contrato |
| Dados de tenant cancelado | **30 dias** de carência + eliminação total em **90 dias** (incl. propagação a backups) | — | Job automático + verificação | RGPD art. 17 |
| Prompts/inputs enviados a modelos de IA | **30 dias** | Logs dedicados, acesso restrito | Automática | Debugging e abuse detection |
| Outputs de IA armazenados pelo cliente | Igual aos dados do tenant | BD primária | Com o tenant | Funcionalidade do produto |
| Dados de treino/fine-tuning | **Proibido** usar dados de clientes sem consentimento explícito e contratual (opt-in por tenant) | — | — | Privacidade e contratos |
| Dados de faturação e faturas | **10 anos** | Sistema de faturação | Automática | Obrigação fiscal (PT) |
| Emails e tickets de suporte | **3 anos** após fecho | Helpdesk | Automática | Continuidade de suporte |
| Candidaturas de emprego não selecionadas | **6 meses** (ou consentimento para mais) | ATS | Automática | CNPD / RGPD |

## RPO / RTO

- **RPO (perda máxima de dados): 1 hora** — WAL/replicação contínua.
- **RTO (tempo máximo de recuperação): 4 horas** — restore testado **trimestralmente** com relatório.
- Um backup não testado não conta como backup.

## Direitos dos titulares (RGPD)

- **Acesso/portabilidade:** export completo por tenant disponível self-service ou em ≤ 30 dias.
- **Apagamento (art. 17):** pipeline de eliminação por utilizador/tenant, executado em ≤ 30 dias, incluindo propagação a réplicas; backups expiram naturalmente em ≤ 35 dias e o restore de backups antigos re-executa a lista de eliminações pendentes.
- **Registo de pedidos:** todos os pedidos RGPD ficam registados (quem, quando, ação, conclusão).

## Regras de IA (explícitas)

1. Dados de clientes **nunca** são enviados a fornecedores de IA que treinem nos inputs; contratos com fornecedores exigem cláusula de *no-training* e retenção ≤ 30 dias do lado do fornecedor.
2. Logs de prompts são pseudonimizados quando tecnicamente viável (IDs em vez de PII em claro).
3. Qualquer novo uso de dados para IA exige RFC + parecer do DPO.

## Enforcement

- Toda a nova tabela/bucket/tópico declara categoria de retenção na RFC ou PR de criação; CI valida a existência de TTL/política.
- Auditoria semestral: amostragem de dados vs. tabela acima; desvios são incidentes de severidade alta.
