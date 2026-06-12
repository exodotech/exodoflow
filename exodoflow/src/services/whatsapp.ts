// Serviço WhatsApp.
// Fase 0: estado do canal. Fase 1A: LEITURA de conversas/mensagens reais que o
// webhook inbound gravou (RLS tenant-scoped). NÃO envia (resposta é fase futura).
import { createClient } from '@/lib/supabase/client'
import { registarAuditoria } from '@/services/audit'
import type { WhatsAppConversation, WhatsAppMessage } from '@/types/domain/whatsapp'
import type { TemplatePurpose } from '@/types/domain/communication'

// Estado da conversa na UI → coluna status (CHECK: active|waiting|resolved|archived)
export type ConversaStatus = 'active' | 'waiting' | 'resolved' | 'archived'

export interface EstadoWhatsApp {
  existe:    boolean
  is_active: boolean
  numero:    string | null   // settings futuros (config.phone_number); hoje sempre null
}

export async function obterEstadoWhatsApp(): Promise<EstadoWhatsApp> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('communication_channels')
    .select('is_active, config')
    .eq('channel', 'whatsapp')
    .maybeSingle()

  if (error) throw new Error(`Erro ao carregar estado do WhatsApp: ${error.message}`)
  const config = (data?.config ?? {}) as { phone_number?: string }
  return {
    existe:    !!data,
    is_active: data?.is_active ?? false,
    numero:    config.phone_number ?? null,
  }
}

// ── Fase 1A: leitura de conversas/mensagens reais (gravadas pelo webhook) ──────
// RLS tenant-scoped (wa_conversations_select_roles / wa_messages_select_roles).
export async function listarConversasReais(): Promise<WhatsAppConversation[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .order('last_message_at', { ascending: false })
    .limit(200)
  if (error) throw new Error(`Erro ao listar conversas: ${error.message}`)
  return (data ?? []) as unknown as WhatsAppConversation[]
}

export async function listarMensagensReais(conversationId: string): Promise<WhatsAppMessage[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(500)
  if (error) throw new Error(`Erro ao listar mensagens: ${error.message}`)
  return (data ?? []) as unknown as WhatsAppMessage[]
}

// ── Fase 1B: resposta manual + gestão da conversa ─────────────────────────────

// Envia resposta MANUAL pela route server-side (o access_token nunca chega aqui).
export async function enviarRespostaManual(conversationId: string, content: string): Promise<void> {
  const res = await fetch('/api/whatsapp/send-message', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ conversation_id: conversationId, content }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? 'Não foi possível enviar a mensagem.')
  }
}

// ── Fase 1C: envio MANUAL de template operacional ─────────────────────────────

// Envia um template (confirmação/lembrete/cancelamento/reagendamento) ligado a
// uma marcação, pela route server-side (o access_token nunca chega aqui).
export async function enviarTemplateMarcacao(bookingId: string, purpose: TemplatePurpose): Promise<void> {
  const res = await fetch('/api/whatsapp/send-template', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ booking_id: bookingId, template_purpose: purpose }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? 'Não foi possível enviar o template.')
  }
}

// Atribui/desatribui a conversa (assigned_to). RLS: owner/manager/receptionist.
export async function atribuirConversa(conversationId: string, profileId: string | null): Promise<void> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .update({ assigned_to: profileId })
    .eq('id', conversationId)
    .select('id')
  if (error) throw new Error(`Erro ao atribuir conversa: ${error.message}`)
  if (!data?.length) throw new Error('Sem permissão para atribuir.')
  await registarAuditoria('whatsapp.assign', { table: 'whatsapp_conversations', recordId: conversationId, metadata: { assigned_to: profileId } })
}

// Define o estado da conversa (abrir/pendente/resolvida/fechada).
export async function definirStatusConversa(conversationId: string, status: ConversaStatus): Promise<void> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .update({ status })
    .eq('id', conversationId)
    .select('id')
  if (error) throw new Error(`Erro ao mudar estado: ${error.message}`)
  if (!data?.length) throw new Error('Sem permissão para mudar o estado.')
  await registarAuditoria('whatsapp.status', { table: 'whatsapp_conversations', recordId: conversationId, metadata: { status } })
}

// Guarda notas internas (NÃO são enviadas ao WhatsApp — só a equipa vê).
export async function guardarNotaInterna(conversationId: string, notas: string): Promise<void> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .update({ internal_notes: notas })
    .eq('id', conversationId)
    .select('id')
  if (error) throw new Error(`Erro ao guardar nota: ${error.message}`)
  if (!data?.length) throw new Error('Sem permissão para editar notas.')
  await registarAuditoria('whatsapp.note', { table: 'whatsapp_conversations', recordId: conversationId })
}
