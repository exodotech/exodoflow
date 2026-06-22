// Processamento do webhook inbound do WhatsApp Cloud API (SERVER-SIDE).
// Usa a service_role (createAdminClient) porque o webhook é público/sem sessão:
// a RLS de tenant não se aplica — o tenant é resolvido pelo phone_number_id e
// validado contra um canal ACTIVO. Nunca escreve no tenant errado.
//
// Fase 1A: apenas RECEBE (inbound + status callbacks). NÃO envia, NÃO chama IA.
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import type { WhatsAppWebhookPayload } from '@/types/domain/whatsapp'
import type { Json } from '@/types/database'

type ChangeValue = WhatsAppWebhookPayload['entry'][number]['changes'][number]['value']

// message_type permitido pela BD (CHECK). Tipos não suportados caem em 'text'
// (o payload cru fica guardado na coluna payload para não perder informação).
const ALLOWED_TYPES = new Set(['text', 'image', 'audio', 'document', 'template'])
const mapType = (t: string | undefined): string => (t && ALLOWED_TYPES.has(t) ? t : 'text')

export interface InboundResult {
  matched:   boolean   // havia canal activo para o phone_number_id?
  inserted:  number    // mensagens novas gravadas
  duplicates: number   // mensagens ignoradas (já existiam)
  statuses:  number    // status callbacks aplicados
}

// Resolve o tenant pelo phone_number_id, exigindo um canal whatsapp ACTIVO.
// Devolve null se não houver canal — o webhook não grava nada (mas responde 200).
async function resolveTenantId(phoneNumberId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('communication_channels')
    .select('tenant_id, config')
    .eq('channel', 'whatsapp')
    .eq('is_active', true)
    .eq('config->>phone_number_id', phoneNumberId)
    .limit(1)
    .maybeSingle()

  if (error) {
    logger.warn('Erro ao resolver tenant do WhatsApp', { phone_number_id: phoneNumberId, erro: error.message })
    return null
  }
  return data?.tenant_id ?? null
}

// Garante a conversa (por tenant + telefone) e devolve o seu id.
async function upsertConversation(
  tenantId: string, waPhone: string, contactName: string | null, when: string
): Promise<string | null> {
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('whatsapp_conversations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('wa_phone_number', waPhone)
    .limit(1)
    .maybeSingle()

  if (existing?.id) {
    await admin
      .from('whatsapp_conversations')
      .update({ last_message_at: when, ...(contactName ? { wa_contact_name: contactName } : {}) })
      .eq('id', existing.id)
    return existing.id
  }

  const { data: created, error } = await admin
    .from('whatsapp_conversations')
    .insert({
      tenant_id:       tenantId,
      wa_phone_number: waPhone,
      wa_contact_name: contactName,
      status:          'active',   // CHECK: active|waiting|resolved|archived (não há 'open')
      last_message_at: when,
    })
    .select('id')
    .single()

  if (error) {
    logger.warn('Falha ao criar conversa WhatsApp', { tenant_id: tenantId, erro: error.message })
    return null
  }
  return created.id
}

// Processa um "change" do payload: mensagens inbound + status callbacks.
export async function processChangeValue(value: ChangeValue): Promise<InboundResult> {
  const result: InboundResult = { matched: false, inserted: 0, duplicates: 0, statuses: 0 }

  const phoneNumberId = value?.metadata?.phone_number_id
  if (!phoneNumberId) return result

  const tenantId = await resolveTenantId(phoneNumberId)
  if (!tenantId) {
    // Sem canal activo → não grava (evita escrever em tenant errado). 200 para a Meta não repetir.
    logger.warn('WhatsApp: phone_number_id sem canal activo — ignorado', { phone_number_id: phoneNumberId })
    return result
  }
  result.matched = true

  const admin = createAdminClient()
  const contactName = value.contacts?.[0]?.profile?.name ?? null

  // ── Mensagens inbound ──────────────────────────────────────────────────────
  for (const msg of value.messages ?? []) {
    const when = msg.timestamp ? new Date(Number(msg.timestamp) * 1000).toISOString() : new Date().toISOString()
    const conversationId = await upsertConversation(tenantId, msg.from, contactName, when)
    if (!conversationId) continue

    const content = msg.text?.body ?? ''

    // Idempotência: verifica ANTES de inserir (a Meta reenvia o mesmo wa_message_id).
    // O índice único (tenant_id, wa_message_id) é o backstop para corridas.
    const { data: jaExiste } = await admin
      .from('whatsapp_messages')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('wa_message_id', msg.id)
      .limit(1)
      .maybeSingle()
    if (jaExiste) { result.duplicates += 1; continue }

    const { error } = await admin
      .from('whatsapp_messages')
      .insert({
        tenant_id:        tenantId,
        conversation_id:  conversationId,
        wa_message_id:    msg.id,
        direction:        'inbound',
        message_type:     mapType(msg.type),
        content,
        payload:          msg as unknown as Json,   // payload CRU para auditoria
        is_ai_generated:  false,
        processed_status: 'pending',
      })

    if (error) {
      // 23505 = violação de unicidade → corrida com outro pedido idêntico (já gravada)
      if (error.code === '23505') { result.duplicates += 1; continue }
      logger.warn('Falha ao gravar mensagem WhatsApp', { tenant_id: tenantId, erro: error.message })
      continue
    }
    result.inserted += 1
  }

  // ── Status callbacks (sent/delivered/read/failed) ──────────────────────────
  for (const st of value.statuses ?? []) {
    const when = st.timestamp ? new Date(Number(st.timestamp) * 1000).toISOString() : new Date().toISOString()
    const patch: { delivered_at?: string; read_at?: string; processed_status?: string } = {}
    if (st.status === 'delivered') patch.delivered_at = when
    else if (st.status === 'read') { patch.read_at = when; patch.delivered_at = when }
    else if (st.status === 'failed') patch.processed_status = 'failed'
    if (Object.keys(patch).length === 0) continue

    const { data, error } = await admin
      .from('whatsapp_messages')
      .update(patch)
      .eq('tenant_id', tenantId)
      .eq('wa_message_id', st.id)
      .select('id')

    if (error) { logger.warn('Falha ao aplicar status WhatsApp', { erro: error.message }); continue }
    if (!data || data.length === 0) {
      logger.warn('Status para mensagem inexistente — ignorado', { wa_message_id: st.id })
      continue
    }
    result.statuses += 1
  }

  return result
}

// Processa o payload completo (várias entries/changes).
export async function processWebhookPayload(payload: WhatsAppWebhookPayload): Promise<InboundResult> {
  const total: InboundResult = { matched: false, inserted: 0, duplicates: 0, statuses: 0 }
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const r = await processChangeValue(change.value)
      total.matched = total.matched || r.matched
      total.inserted += r.inserted
      total.duplicates += r.duplicates
      total.statuses += r.statuses
    }
  }
  return total
}
