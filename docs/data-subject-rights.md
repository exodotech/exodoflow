# Direitos dos Titulares — ExodoFlow Pro (guia técnico/operacional)

> Como o sistema **suporta** o atendimento de pedidos de titulares (LGPD art. 18 /
> RGPD art. 15–22). **Não é parecer jurídico.** Prazos legais e formulação das
> respostas ao titular devem seguir aconselhamento jurídico e as políticas do tenant.

## 1. Quem atende o quê

- A **empresa cliente (tenant)** é, regra geral, o **controlador** dos dados dos seus
  titulares (equipa e clientes finais) e é quem **decide e executa** o pedido.
- **ExodoFlow Pro (operador)** fornece os meios técnicos e **apoia** o tenant, sem
  decidir sobre dados de que é mero operador.

## 2. Tipos de pedido suportados (registo)

A tabela `data_subject_requests` (migração 0041) regista e acompanha:

| Tipo (`request_type`) | Direito | Como o sistema ajuda hoje |
|---|---|---|
| `acesso` | Acesso/confirmação | Consultar dados do titular nas telas (cliente, equipa, marcações, fichas). |
| `correcao` | Correção | Editar cliente/perfil pelos fluxos existentes (com auditoria). |
| `exclusao` | Eliminação | Soft-delete de cliente (RPC 0017); avaliar exceções legais (recibos/fichas). |
| `anonimizacao` | Anonimização | Substituir identificadores preservando histórico estatístico (processo manual). |
| `exportacao` | Portabilidade | ✅ **Exportar dados do titular em JSON** (botão "Exportar (RGPD)" no detalhe do cliente, manager+). |
| `restricao` | Restrição de tratamento | Suspender comunicações/uso (processo manual + nota no registo). |
| `oposicao` | Oposição | Cessar tratamento aplicável (ex.: marketing), quando cabível. |

Estados (`status`): `received` → `in_progress` → `completed` | `rejected`.
Campos de prazo: `received_at`, `resolved_at`, `handled_by`, `notes`.

## 3. Estado de implementação

- ✅ **Estrutura de dados** pronta (`data_subject_requests`, RLS só owner/manager).
- ✅ **Soft-delete** de cliente e trilho de **consentimento** (`legal_consents`).
- ✅ **Auditoria** das ações (criação/edição/remoção) para prova de tratamento.
- ✅ **Tela em Configurações** para registar/gerir pedidos (PainelPrivacidade).
- ✅ **Exportação por titular** (cliente) em JSON — direito de acesso/portabilidade.
- ✅ **Anonimização** (apagamento) — botão owner-only no detalhe do cliente, com
  confirmação; remove a PII, revoga consentimentos e preserva o histórico
  (RPC `anonymize_client`, endurecido na 0044: só owner do próprio tenant).
- 🔜 **Roadmap:**
  1. Exportação também por perfil de equipa (hoje cobre clientes).
  2. Modelos de resposta ao titular (a redigir com revisão jurídica).

## 4. Procedimento manual recomendado (até existir UI)

1. Registar o pedido em `data_subject_requests` (ou suporte interno) com tipo e prazo.
2. Confirmar identidade do requerente (evitar divulgação indevida).
3. Localizar os dados do titular (cliente/perfil) nas telas existentes.
4. Executar a ação adequada (corrigir, soft-delete, anonimizar, exportar).
5. **Verificar exceções legais** (retenção fiscal/saúde) — pode justificar recusa
   parcial; documentar em `notes` e comunicar ao titular.
6. Marcar `status=completed` (ou `rejected` com justificação) e `resolved_at`.
7. A ação fica auditada (`audit_logs`).

## 5. Limites importantes

- **Retenção legal prevalece** sobre apagamento (recibos, fichas de saúde dentro do
  prazo legal). Ver [data-retention-policy.md](data-retention-policy.md).
- Pedidos sobre dados de que o tenant é **controlador** são decididos pelo tenant;
  ExodoFlow Pro apenas apoia tecnicamente.
