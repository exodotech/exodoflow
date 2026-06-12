# WhatsApp Cloud API — Fase 1B (Resposta Manual Outbound)

> Esta fase permite **resposta humana** pelo WhatsApp dentro da **janela de 24h**.
> **NÃO** há IA, **NÃO** há templates iniciados pelo negócio, **NÃO** há automações.
>
> Endpoint: `POST /api/whatsapp/send-message` (autenticado, server-side).

## 1. Variáveis de ambiente (servidor)

```bash
# Modo de teste seguro: NÃO chama a Meta; devolve resposta fake no formato Meta
# e grava mensagem/log na mesma. Documentado como DEV/TEST.
WHATSAPP_OUTBOUND_MOCK=true
```

> Em **produção**, com o mock ligado, o serviço regista um aviso de segurança
> (`whatsapp.outbound.mock`). Para envio real, `WHATSAPP_OUTBOUND_MOCK` ausente/false.
> O `access_token` **nunca** vai para o frontend — vive em `communication_channels.config`.

## 2. Configurar um canal WhatsApp activo (local)

O envio exige um canal whatsapp **activo** com `phone_number_id` **e** `access_token`:

```sql
-- docker exec -i supabase_db_exodoflowIA psql -U postgres -d postgres
UPDATE communication_channels
SET is_active = true,
    config = config || '{"phone_number_id":"123456789012345","access_token":"TEST_TOKEN_LOCAL"}'::jsonb
WHERE channel = 'whatsapp'
  AND tenant_id = (SELECT id FROM tenants WHERE business_type='estetica' LIMIT 1);
```

> `access_token` em teste pode ser qualquer string (o **mock não o usa**). Em produção
> é o token real do número (gerido pela futura UI segura "Ligar WhatsApp", Fase 1D).

## 3. Janela de 24h

A Meta só permite mensagens de **sessão** (texto livre) nas **24h** após a **última
mensagem do cliente** (inbound). Fora disso, é preciso um **template aprovado**
(Fase 1C). O serviço valida isto e bloqueia com:

> *"Fora da janela de 24h. Use template aprovado na próxima fase."*

Para testar o envio, garante que existe uma mensagem inbound recente (ver
`docs/whatsapp-phase-1a.md` para injetar uma via webhook).

## 4. Testar o envio (mock)

```bash
# (autenticado como owner/manager/receptionist — usa a sessão do browser/cookies)
curl -s -X POST "http://localhost:3000/api/whatsapp/send-message" \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"conversation_id":"<ID>","content":"Olá! Confirmo a sua marcação."}'
# → {"ok":true,"message_id":"..."}
```

Gatilho de **falha** (testa o caminho FAILED): enviar `content` igual a `MOCK_FAIL`
→ devolve erro e grava `communication_logs.status = failed`.

Verificar no banco:
```sql
SELECT direction, content, processed_status FROM whatsapp_messages WHERE direction='outbound' ORDER BY created_at DESC LIMIT 3;
SELECT channel, event_type, status, recipient FROM communication_logs ORDER BY created_at DESC LIMIT 3;
```
Esperado (mock): mensagem `outbound` (`processed_status=sent`, `is_ai_generated=false`)
+ `communication_logs` com `status=simulated`.

## 5. Permissões

- **OWNER / MANAGER / RECEPTIONIST** podem responder, atribuir e mudar estado (permissão `conversas.reply`).
- **STAFF** não, nesta fase.
- O `tenant_id` vem **sempre da sessão** (nunca do browser). A conversa é validada
  como pertencente ao tenant; tenant A não responde numa conversa do tenant B.

## 6. Gestão da conversa

- **Atribuição** (`assigned_to`): atribuir/remover; filtros Todas / Minhas / Não atribuídas.
- **Estado**: Aberta (`active`), Pendente (`waiting`), Resolvida (`resolved`), Fechada (`archived`). Conversas **não são apagadas**.
- **Notas internas** (`internal_notes`): só a equipa vê; **nunca** enviadas ao WhatsApp.
- Todas as acções (enviar, atribuir, mudar estado, nota) geram **audit log** (sem tokens).

## 7. Status de envio (callbacks)

O webhook da Fase 1A (`/api/whatsapp/webhook`) atualiza `delivered_at`/`read_at`/`failed`
das mensagens **outbound** pelo `wa_message_id` (sent → delivered → read).

## 8. Limitações desta fase

- **Sem templates** iniciados pelo negócio (fora da janela de 24h fica bloqueado).
- **Sem IA**, sem chatbot, sem automações.
- Envio **síncrono** (adequado a volume manual). Para escala, enfileirar.
