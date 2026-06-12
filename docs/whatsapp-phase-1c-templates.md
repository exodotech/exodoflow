# WhatsApp Cloud API — Fase 1C (Templates Operacionais)

> Esta fase permite **mensagens operacionais iniciadas pelo negócio** através de
> **templates aprovados** pela Meta (confirmação, lembretes, cancelamento,
> reagendamento).
>
> **NÃO** há IA, **NÃO** há chatbot, **NÃO** há automações, **NÃO** há envio
> automático. Cada envio é **manual**, desencadeado pela equipa a partir da agenda.
>
> Endpoint: `POST /api/whatsapp/send-template` (autenticado, server-side).

## 1. Mensagem livre (24h) vs. Template

A Meta distingue dois tipos de mensagem outbound:

| | Mensagem de sessão (Fase 1B) | Template (Fase 1C) |
|---|---|---|
| Quando | Só nas **24h** após a última mensagem **inbound** do cliente | A **qualquer momento** (iniciada pelo negócio) |
| Conteúdo | Texto livre | Template **aprovado** pela Meta, com variáveis |
| Endpoint | `/api/whatsapp/send-message` | `/api/whatsapp/send-template` |
| Uso típico | Responder a uma conversa | Confirmar/lembrar/cancelar uma marcação |

Fora da janela de 24h, **só** templates podem ser enviados — é precisamente o que
esta fase resolve para mensagens ligadas a marcações.

## 2. Modelo de dados

Os campos Meta foram adicionados a `communication_templates` (migração **0028**):

| Campo | Descrição |
|---|---|
| `channel` | `whatsapp` (canal/`channel_type`) |
| `provider` | `meta` (WhatsApp Cloud API) |
| `locale` | `pt-PT` / `pt-BR` |
| `event_type` | propósito interno (ver mapa abaixo) |
| `name` / `body` | nome interno + corpo com `{{placeholders}}` |
| `variables` | lista **ordenada** dos nomes de variáveis (`["nome","servico","data","hora"]`) → mapeia para os parâmetros posicionais `{{1}},{{2}}…` da Meta |
| `meta_template_name` | nome do template **aprovado** na Meta (snake_case) |
| `meta_language_code` | `pt_PT` / `pt_BR` |
| `meta_category` | `UTILITY` (operacional) |
| `meta_status` | espelho **local** do estado de aprovação na Meta |
| `is_active` | template activo |

### Propósitos (Fase 1C) → `event_type`

A API usa um **propósito** público; o serviço mapeia-o para `event_type` na BD:

| `template_purpose` (API) | `event_type` (BD) | `meta_template_name` |
|---|---|---|
| `booking_confirmation` | `booking_confirmed` | `booking_confirmation` |
| `booking_reminder_24h` | `booking_reminder_24h` | `booking_reminder_24h` |
| `booking_reminder_2h` | `booking_reminder_2h` | `booking_reminder_2h` |
| `booking_cancellation` | `booking_cancelled` | `booking_cancellation` |
| `booking_reschedule` | `booking_reschedule` | `booking_reschedule` |

> **Esta fase NÃO cria templates oficiais na Meta** — apenas mapeia nomes e
> variáveis locais. O estado real de aprovação (`meta_status`) é geri­do quando a
> UI segura "Ligar WhatsApp" existir (Fase 1D). Por isso, nos templates semeados
> `meta_status = PENDING`.

## 3. Variáveis suportadas

As variáveis base derivam **automaticamente** da marcação (no fuso/locale do tenant):

- `nome` — nome do cliente
- `servico` — nome do serviço
- `data` — data da marcação (formatada no locale do tenant)
- `hora` — hora da marcação (formatada no fuso do tenant)

A ordem enviada à Meta é a declarada em `communication_templates.variables`.

## 4. Modo mock (DEV/TEST)

```bash
# Não chama a Meta; devolve um id fake e grava o log na mesma.
WHATSAPP_TEMPLATE_MOCK=true     # (ou reutiliza WHATSAPP_OUTBOUND_MOCK=true)
```

- Em **mock**, o `meta_status` é **ignorado** (permite testar sem aprovação real).
- Em **produção com mock**, o serviço regista um aviso de segurança
  (`whatsapp.template.mock`).
- Em **envio real** (mock ausente/false), exige-se `meta_status = APPROVED`.
- O `access_token` **nunca** vai para o frontend — vive em
  `communication_channels.config`.

## 5. Configurar um canal WhatsApp activo (local)

O envio exige um canal whatsapp **activo** com `phone_number_id` **e** `access_token`:

```sql
-- docker exec -i supabase_db_exodoflowIA psql -U postgres -d postgres
UPDATE communication_channels
SET is_active = true,
    config = config || '{"phone_number_id":"123456789012345","access_token":"TEST_TOKEN_LOCAL"}'::jsonb
WHERE channel = 'whatsapp'
  AND tenant_id = (SELECT id FROM tenants WHERE business_type='estetica' LIMIT 1);
```

> Em teste o `access_token` pode ser qualquer string (o **mock não o usa**).

## 6. Testar o envio (mock)

```bash
# (autenticado como owner/manager/receptionist — usa a sessão do browser/cookies)
curl -s -X POST "http://localhost:3000/api/whatsapp/send-template" \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"booking_id":"<ID>","template_purpose":"booking_confirmation"}'
# → {"ok":true,"log_id":"...","mock":true}
```

Na agenda, cada marcação tem um botão **WhatsApp** com as acções:
Confirmação · Lembrete 24h · Lembrete 2h · Cancelamento · Reagendamento.
Se o canal não estiver activo, o botão fica **desactivado** com o tooltip
"WhatsApp não configurado".

Verificar no banco:
```sql
SELECT event_type, status, recipient, error
FROM communication_logs
WHERE channel='whatsapp' ORDER BY created_at DESC LIMIT 5;
```
Esperado (mock): log com `status=simulated`; em produção real, `status=sent`.

## 7. Permissões

- **OWNER / MANAGER / RECEPTIONIST** podem enviar templates (permissão `conversas.reply`).
- **STAFF** **não**, nesta fase (sem permissão explícita).
- O `tenant_id` vem **sempre da sessão** (nunca do browser). A marcação é validada
  como pertencente ao tenant; tenant A não envia template sobre marcação do tenant B.

## 8. Logs

Cada tentativa grava um `communication_logs` (sem `access_token`):

| Situação | `status` | `error` |
|---|---|---|
| Template enviado (mock) | `simulated` | — |
| Template enviado (real) | `sent` | — |
| Falha de envio na Meta | `failed` | mensagem da Meta |
| Template não configurado | `failed` | `Template não configurado` |
| Canal WhatsApp inactivo | `failed` | `Canal WhatsApp inactivo` |
| Cliente sem telefone | `failed` | `Cliente sem telefone` |
| Template não aprovado (real) | `failed` | `Template não aprovado pela Meta` |

Todas as acções de envio geram também **audit log** (`whatsapp.send_template`).

## 9. Limitações desta fase

- **Sem IA**, sem chatbot, sem automações, **sem envio automático** (tudo manual).
- Templates **não** são criados/aprovados na Meta aqui — apenas mapeados localmente.
- Sem UI de gestão de templates / "Ligar WhatsApp" (Fase 1D).
- Os status de entrega (delivered/read) de templates não são reconciliados nesta
  fase (o webhook 1A reconcilia mensagens de `whatsapp_messages`; os templates
  registam-se em `communication_logs`).
- Tenants reais precisam dos seus templates mapeados (a migração semeia apenas o
  tenant de exemplo + faz backfill dos campos Meta nos templates já existentes).
