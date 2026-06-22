import type { Database } from '@/types/database'

// Estado de uma conversa WhatsApp
export type WhatsAppConversationStatus = 'active' | 'resolved' | 'waiting' | 'archived'

// Direcção da mensagem (entrada/saída)
export type WhatsAppMessageDirection = 'inbound' | 'outbound'

// Estado de processamento pela IA (migration 0006)
export type WhatsAppProcessedStatus = 'pending' | 'processing' | 'processed' | 'failed'

type _ConvRow = Database['public']['Tables']['whatsapp_conversations']['Row']

// Conversa com status tipado (não string genérico)
export type WhatsAppConversation = Omit<_ConvRow, 'status'> & {
  status: WhatsAppConversationStatus
}

type _MsgRow = Database['public']['Tables']['whatsapp_messages']['Row']

// Mensagem com direction tipado; processed_status adicionado em migration 0006
// (não consta no database.ts gerado — foi adicionado após geração)
export type WhatsAppMessage = Omit<_MsgRow, 'direction'> & {
  direction: WhatsAppMessageDirection
  processed_status: WhatsAppProcessedStatus
}

// Estrutura do webhook Meta Business API (usada pelo simulador e handler real)
export interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account'
  entry: Array<{
    id: string
    changes: Array<{
      value: {
        messaging_product: 'whatsapp'
        metadata: {
          display_phone_number: string
          phone_number_id: string
        }
        contacts?: Array<{
          profile: { name: string }
          wa_id: string
        }>
        messages?: Array<{
          from: string
          id: string
          timestamp: string
          text?: { body: string }
          type: string
        }>
        statuses?: Array<{
          id: string
          status: string
          timestamp: string
          recipient_id: string
        }>
      }
      field: 'messages'
    }>
  }>
}

// Feature flag por tenant
export type FeatureFlag = Database['public']['Tables']['feature_flags']['Row']
