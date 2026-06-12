# WhatsApp Cloud API — Fase 1A (Webhook Inbound)

> Esta fase implementa **apenas o recebimento** (inbound + status callbacks).
> **NÃO** envia mensagens, **NÃO** chama IA, **NÃO** usa access_token.
>
> Endpoint: `GET/POST /api/whatsapp/webhook`

## 1. Variáveis de ambiente (servidor)

Adicionar ao `exodoflow/.env.local` (nunca no frontend):

```bash
# Token de verificação do handshake (escolhido por ti; o mesmo no painel da Meta)
WHATSAPP_VERIFY_TOKEN=meu-verify-token-local

# App Secret da app Meta — valida a assinatura X-Hub-Signature-256 dos POSTs
WHATSAPP_APP_SECRET=               # deixar vazio em dev se usares a flag abaixo

# DEV ONLY: permite POST sem assinatura (apenas se NODE_ENV != production)
WHATSAPP_WEBHOOK_ALLOW_UNSIGNED_DEV=true
```

> Em **produção**: `WHATSAPP_APP_SECRET` é obrigatório e a flag `ALLOW_UNSIGNED_DEV`
> é ignorada — pedidos sem assinatura válida são **bloqueados (401)**.

## 2. Configurar um canal WHATSAPP "fake" num tenant (local)

O webhook resolve o tenant pelo `phone_number_id`. Para testar, aponta um canal
whatsapp activo de um tenant ao `phone_number_id` das fixtures (`123456789012345`):

```sql
-- (no container: docker exec -i supabase_db_exodoflowIA psql -U postgres -d postgres)
UPDATE communication_channels
SET is_active = true,
    config = jsonb_set(COALESCE(config,'{}'::jsonb), '{phone_number_id}', '"123456789012345"')
WHERE channel = 'whatsapp'
  AND tenant_id = (SELECT id FROM tenants WHERE business_type='estetica' LIMIT 1);
```

> Em produção este passo é feito pela futura UI "Ligar WhatsApp" (Fase 1D), que
> guarda `phone_number_id`/`access_token` de forma segura.

## 3. Gerar a assinatura HMAC para o curl

A Meta envia `X-Hub-Signature-256: sha256=<hmac>` onde o hmac é HMAC-SHA256 do
**corpo cru** com o App Secret:

```bash
BODY=$(cat tests/fixtures/whatsapp/inbound-text.json)
SIG="sha256=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$WHATSAPP_APP_SECRET" | sed 's/^.* //')"
echo "$SIG"
```

> Em **dev sem App Secret**, com `WHATSAPP_WEBHOOK_ALLOW_UNSIGNED_DEV=true`, podes
> omitir o cabeçalho de assinatura.

## 4. GET — verificação (handshake)

```bash
# Token correcto → 200 + challenge
curl -s "http://localhost:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=$WHATSAPP_VERIFY_TOKEN&hub.challenge=12345"
# → 12345

# Token errado → 403
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=ERRADO&hub.challenge=12345"
# → 403
```

## 5. POST — mensagens inbound

```bash
# Dev sem assinatura (flag ligada)
curl -s -X POST "http://localhost:3000/api/whatsapp/webhook" \
  -H "Content-Type: application/json" \
  --data-binary @tests/fixtures/whatsapp/inbound-text.json
# → {"ok":true}

# Produção/assinado:
curl -s -X POST "http://localhost:3000/api/whatsapp/webhook" \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: $SIG" \
  --data-binary @tests/fixtures/whatsapp/inbound-text.json
```

Fixtures incluídas (`tests/fixtures/whatsapp/`):
- `inbound-text.json` — mensagem de texto nova.
- `inbound-duplicate.json` — mesmo `wa_message_id` (testa idempotência).
- `inbound-status-delivered.json` — status callback (delivered).
- `unknown-phone-number-id.json` — `phone_number_id` sem canal (não grava).

## 6. Verificar no banco

```sql
SELECT wa_phone_number, status, last_message_at FROM whatsapp_conversations ORDER BY last_message_at DESC LIMIT 5;
SELECT wa_message_id, direction, message_type, content, processed_status, delivered_at
FROM whatsapp_messages ORDER BY created_at DESC LIMIT 5;
```

Esperado após o POST de texto: 1 conversa (`status=active`) + 1 mensagem
(`direction=inbound`, `processed_status=pending`, `is_ai_generated=false`).
Após o POST duplicado: **continua 1 mensagem** (não duplica). Após o status:
`delivered_at` preenchido.

## 7. Segurança (resumo)

- Assinatura HMAC obrigatória em produção (`X-Hub-Signature-256`).
- `WHATSAPP_APP_SECRET` / `WHATSAPP_VERIFY_TOKEN` **só no servidor**; nunca logados.
- Webhook usa `service_role` server-side e resolve o tenant pelo `phone_number_id`
  validado contra um canal **activo** — nunca escreve no tenant errado.
- Rate-limit básico no endpoint; payload cru guardado em `whatsapp_messages.payload`.
- **Sem envio outbound, sem IA, sem access_token** nesta fase.
