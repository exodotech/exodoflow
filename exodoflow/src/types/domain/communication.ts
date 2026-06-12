// Tipos de domínio — Motor de Comunicação
// Fase actual: fundação arquitectural (sem envio real)

// Canais de comunicação suportados
export type CommunicationChannel = 'whatsapp' | 'sms' | 'email'

// Eventos que disparam comunicações
export type CommunicationEventType =
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_reminder_24h'
  | 'booking_reminder_1h'
  | 'booking_reminder_2h'
  | 'booking_reschedule'
  | 'booking_completed'
  | 'booking_no_show'

// Propósitos de template operacional da Fase 1C (WhatsApp Cloud API / Meta).
// São a superfície pública usada pela API/agenda; mapeiam para event_type na BD.
export type TemplatePurpose =
  | 'booking_confirmation'
  | 'booking_reminder_24h'
  | 'booking_reminder_2h'
  | 'booking_cancellation'
  | 'booking_reschedule'

// Categorias oficiais de template da Meta
export type MetaTemplateCategory = 'UTILITY' | 'MARKETING' | 'AUTHENTICATION'

// Espelho local do estado de aprovação do template na Meta
export type MetaTemplateStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'DISABLED'

// Estado do ciclo de vida de uma comunicação
// simulated → apenas log, sem envio (fase actual)
// queued/sent/delivered/failed → ciclo real (fases futuras)
export type CommunicationStatus = 'simulated' | 'queued' | 'sent' | 'delivered' | 'failed'

// Locale suportado
export type SupportedLocale = 'pt-PT' | 'pt-BR'

// Canal configurado por tenant
export interface CommunicationChannelConfig {
  id:         string
  tenant_id:  string
  channel:    CommunicationChannel
  is_active:  boolean
  config:     Record<string, unknown>
  created_at: string
  updated_at: string
}

// Template de mensagem com placeholders
export interface CommunicationTemplate {
  id:         string
  tenant_id:  string
  channel:    CommunicationChannel
  event_type: CommunicationEventType
  name:       string
  body:       string
  is_active:  boolean
  locale:     SupportedLocale
  created_at: string
  updated_at: string
  // ── Campos Meta (Fase 1C) ──────────────────────────────────────────────────
  provider:           'meta' | null
  variables:          string[]                  // nomes ordenados das variáveis do corpo
  meta_template_name: string | null
  meta_language_code: string | null
  meta_category:      MetaTemplateCategory | null
  meta_status:        MetaTemplateStatus
}

// Registo de comunicação (imutável após inserção)
export interface CommunicationLog {
  id:          string
  tenant_id:   string
  booking_id:  string | null
  client_id:   string | null
  channel:     CommunicationChannel
  event_type:  string
  template_id: string | null
  recipient:   string
  body:        string
  status:      CommunicationStatus
  error:       string | null
  sent_at:     string | null
  created_at:  string
}

// Payload para criar um log de comunicação (via INSERT)
export interface CriarCommunicationLogInput {
  booking_id:  string | null
  client_id:   string | null
  channel:     CommunicationChannel
  event_type:  CommunicationEventType
  template_id: string | null
  recipient:   string
  body:        string
  status:      CommunicationStatus
}

// Contexto para interpolação de placeholders
export interface TemplateContext {
  nome:         string
  data:         string
  hora:         string
  servico:      string
  profissional: string
  link?:        string
}
