// Envio de TEMPLATE WhatsApp (Meta Cloud API) — SERVER-SIDE apenas. Fase 1C.
// Mensagens OPERACIONAIS iniciadas pelo negócio (confirmação, lembrete,
// cancelamento, reagendamento). NÃO há IA, NÃO há chatbot, NÃO há automações:
// o disparo é sempre MANUAL (a partir da agenda).
//
// SEGURANÇA:
// - o access_token vive em communication_channels.config e NUNCA chega ao browser;
// - este módulo corre só no servidor (service_role via createAdminClient);
// - o tenant_id vem sempre da sessão (a route valida-o), nunca do browser;
// - a marcação é validada como pertencente ao tenant (sem acesso cruzado).
//
// MOCK: com WHATSAPP_TEMPLATE_MOCK=true (ou WHATSAPP_OUTBOUND_MOCK=true) não chama
// a Meta — devolve um id fake e grava o log na mesma. Em mock o estado de aprovação
// do template (meta_status) é ignorado; no envio real exige-se meta_status=APPROVED.
import crypto from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import type { Database } from '@/types/database'
import type { SupportedLocale, TemplatePurpose } from '@/types/domain/communication'

type Admin = SupabaseClient<Database>

const META_GRAPH_VERSION = 'v21.0'

// Propósito público (Fase 1C) → event_type na BD (communication_templates).
const PURPOSE_TO_EVENT: Record<TemplatePurpose, string> = {
  booking_confirmation: 'booking_confirmed',
  booking_reminder_24h: 'booking_reminder_24h',
  booking_reminder_2h:  'booking_reminder_2h',
  booking_cancellation: 'booking_cancelled',
  booking_reschedule:   'booking_reschedule',
}

export const TEMPLATE_PURPOSES = Object.keys(PURPOSE_TO_EVENT) as TemplatePurpose[]

export type TemplateErrorCode =
  | 'no-booking' | 'no-phone' | 'no-template' | 'not-approved'
  | 'no-channel' | 'send-failed' | 'invalid'

export class TemplateError extends Error {
  constructor(message: string, readonly code: TemplateErrorCode) {
    super(message)
  }
}

export interface EnviarTemplateInput {
  tenant_id:        string
  booking_id:       string
  template_purpose: TemplatePurpose
  // Variáveis extra/override; as base (nome/servico/data/hora) derivam da marcação.
  variables?:       Record<string, string>
}

export interface EnviarTemplateResult {
  log_id:        string
  wa_message_id: string
  mock:          boolean
}

function mockAtivo(): boolean {
  return process.env.WHATSAPP_TEMPLATE_MOCK === 'true'
      || process.env.WHATSAPP_OUTBOUND_MOCK === 'true'
}

// Formata data/hora no locale + fuso do tenant (storage é sempre UTC).
function formatarDataHora(iso: string, locale: SupportedLocale, timezone: string) {
  const d = new Date(iso)
  const data = d.toLocaleDateString(locale, { timeZone: timezone, day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora = d.toLocaleTimeString(locale, { timeZone: timezone, hour: '2-digit', minute: '2-digit' })
  return { data, hora }
}

interface MetaSendResponse {
  messages?: Array<{ id: string }>
  error?:    { message?: string }
}

// Chama a Graph API (type=template) ou devolve mock. Lança em falha real.
// Devolve apenas o wa_message_id (o payload completo não é persistido nesta fase).
async function callMetaTemplate(args: {
  phoneNumberId: string
  accessToken:   string
  to:            string
  templateName:  string
  languageCode:  string
  bodyParams:    string[]
}): Promise<{ id: string }> {
  if (mockAtivo()) {
    if (process.env.NODE_ENV === 'production') {
      logger.security('WhatsApp template em MOCK em produção (flag explícita)', { action: 'whatsapp.template.mock' })
    }
    return { id: `wamid.MOCK_${crypto.randomUUID()}` }
  }

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${args.phoneNumberId}/messages`
  const components = args.bodyParams.length
    ? [{ type: 'body', parameters: args.bodyParams.map((text) => ({ type: 'text', text })) }]
    : []
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${args.accessToken}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      messaging_product: 'whatsapp',
      to:                args.to,
      type:              'template',
      template: {
        name:       args.templateName,
        language:   { code: args.languageCode },
        components,
      },
    }),
  })
  const data = (await res.json().catch(() => ({}))) as MetaSendResponse
  if (!res.ok || !data.messages?.[0]?.id) {
    throw new TemplateError(data.error?.message ?? `Envio falhou (HTTP ${res.status})`, 'send-failed')
  }
  return { id: data.messages[0].id }
}

// Grava sempre um communication_log do resultado (sucesso ou bloqueio). Nunca
// inclui o access_token. Falha silenciosa: o log é best-effort, não derruba o envio.
async function registarLog(admin: Admin, args: {
  tenant_id:   string
  booking_id:  string | null
  client_id:   string | null
  event_type:  string
  template_id: string | null
  recipient:   string
  body:        string
  status:      'simulated' | 'sent' | 'failed'
  error?:      string | null
}): Promise<string | null> {
  const { data, error } = await admin
    .from('communication_logs')
    .insert({
      tenant_id:   args.tenant_id,
      booking_id:  args.booking_id,
      client_id:   args.client_id,
      channel:     'whatsapp',
      event_type:  args.event_type,
      template_id: args.template_id,
      recipient:   args.recipient,
      body:        args.body,
      status:      args.status,
      error:       args.error ?? null,
      sent_at:     args.status === 'failed' ? null : new Date().toISOString(),
    })
    .select('id')
    .single()
  if (error) {
    logger.error('Falha ao gravar communication_log de template', { erro: error.message })
    return null
  }
  return data.id
}

export async function enviarTemplateWhatsApp(input: EnviarTemplateInput): Promise<EnviarTemplateResult> {
  const event_type = PURPOSE_TO_EVENT[input.template_purpose]
  if (!event_type) throw new TemplateError('Propósito de template inválido', 'invalid')

  const admin = createAdminClient()

  // 1. Marcação do tenant (+ cliente + serviço). Valida acesso cruzado por tenant.
  const { data: booking } = await admin
    .from('bookings')
    .select('id, tenant_id, client_id, start_at, clients(full_name, phone), services(name)')
    .eq('id', input.booking_id)
    .eq('tenant_id', input.tenant_id)
    .maybeSingle()
  if (!booking) throw new TemplateError('Marcação não encontrada', 'no-booking')

  const client  = booking.clients as unknown as { full_name: string; phone: string | null } | null
  const service = booking.services as unknown as { name: string } | null
  const phone   = client?.phone?.trim() ?? ''

  // 2. Locale + fuso do tenant (storage UTC; exibição no fuso do tenant).
  const { data: tenant } = await admin
    .from('tenants')
    .select('settings')
    .eq('id', input.tenant_id)
    .maybeSingle()
  const settings = (tenant?.settings ?? {}) as { locale?: SupportedLocale; timezone?: string }
  const locale   = settings.locale ?? 'pt-PT'
  const timezone = settings.timezone ?? 'Europe/Lisbon'
  const { data: dataFmt, hora } = formatarDataHora(booking.start_at, locale, timezone)

  // 3. Telefone do cliente — sem destinatário não há envio (log de bloqueio).
  if (!phone) {
    await registarLog(admin, {
      tenant_id: input.tenant_id, booking_id: booking.id, client_id: booking.client_id,
      event_type, template_id: null, recipient: 'desconhecido',
      body: `[template:${input.template_purpose}]`, status: 'failed', error: 'Cliente sem telefone',
    })
    throw new TemplateError('Cliente sem telefone válido', 'no-phone')
  }

  // 4. Template activo (provider meta) para o propósito + locale.
  const { data: template } = await admin
    .from('communication_templates')
    .select('id, body, meta_template_name, meta_language_code, meta_status, variables')
    .eq('tenant_id', input.tenant_id)
    .eq('channel', 'whatsapp')
    .eq('event_type', event_type)
    .eq('locale', locale)
    .eq('is_active', true)
    .maybeSingle()
  if (!template || !template.meta_template_name) {
    await registarLog(admin, {
      tenant_id: input.tenant_id, booking_id: booking.id, client_id: booking.client_id,
      event_type, template_id: template?.id ?? null, recipient: phone,
      body: `[template:${input.template_purpose}]`, status: 'failed', error: 'Template não configurado',
    })
    throw new TemplateError('Template não configurado para este propósito', 'no-template')
  }

  // 5. Canal WhatsApp ACTIVO (access_token + phone_number_id no servidor).
  const { data: channel } = await admin
    .from('communication_channels')
    .select('config')
    .eq('tenant_id', input.tenant_id)
    .eq('channel', 'whatsapp')
    .eq('is_active', true)
    .maybeSingle()
  const cfg = (channel?.config ?? {}) as { access_token?: string; phone_number_id?: string }
  if (!channel || !cfg.phone_number_id || !cfg.access_token) {
    await registarLog(admin, {
      tenant_id: input.tenant_id, booking_id: booking.id, client_id: booking.client_id,
      event_type, template_id: template.id, recipient: phone,
      body: `[template:${input.template_purpose}]`, status: 'failed', error: 'Canal WhatsApp inactivo',
    })
    throw new TemplateError('Canal WhatsApp não configurado ou inactivo', 'no-channel')
  }

  // 6. Em envio REAL, a Meta exige template aprovado. Em mock, ignora-se.
  if (!mockAtivo() && template.meta_status !== 'APPROVED') {
    await registarLog(admin, {
      tenant_id: input.tenant_id, booking_id: booking.id, client_id: booking.client_id,
      event_type, template_id: template.id, recipient: phone,
      body: `[template:${input.template_purpose}]`, status: 'failed', error: 'Template não aprovado pela Meta',
    })
    throw new TemplateError('Template ainda não aprovado pela Meta', 'not-approved')
  }

  // 7. Construir os parâmetros do corpo na ORDEM declarada em variables.
  const contexto: Record<string, string> = {
    nome:    client?.full_name ?? 'Cliente',
    servico: service?.name ?? 'serviço',
    data:    dataFmt,
    hora,
    ...(input.variables ?? {}),
  }
  const ordem = (template.variables as string[] | null) ?? []
  const bodyParams = ordem.map((nome) => contexto[nome] ?? '')

  // Corpo legível para o log (interpolação dos {{placeholders}} do template local).
  const bodyLegivel = template.body.replace(/\{\{(\w+)\}\}/g, (m, k: string) => contexto[k] ?? m)

  // 8. Enviar (Meta real ou mock). Em falha → log FAILED + lança.
  let sent: { id: string }
  try {
    sent = await callMetaTemplate({
      phoneNumberId: cfg.phone_number_id,
      accessToken:   cfg.access_token,
      to:            phone,
      templateName:  template.meta_template_name,
      languageCode:  template.meta_language_code ?? (locale === 'pt-BR' ? 'pt_BR' : 'pt_PT'),
      bodyParams,
    })
  } catch (e) {
    await registarLog(admin, {
      tenant_id: input.tenant_id, booking_id: booking.id, client_id: booking.client_id,
      event_type, template_id: template.id, recipient: phone,
      body: bodyLegivel, status: 'failed',
      error: e instanceof Error ? e.message : 'erro desconhecido',
    })
    throw e instanceof TemplateError ? e : new TemplateError('Envio falhou', 'send-failed')
  }

  // 9. Log de sucesso (mock=simulated, real=sent). NUNCA grava o access_token.
  const isMock = mockAtivo()
  const logId = await registarLog(admin, {
    tenant_id: input.tenant_id, booking_id: booking.id, client_id: booking.client_id,
    event_type, template_id: template.id, recipient: phone,
    body: bodyLegivel, status: isMock ? 'simulated' : 'sent',
  })

  logger.info('WhatsApp template enviado', {
    action: 'whatsapp.template', mock: isMock, purpose: input.template_purpose, booking_id: booking.id,
  })
  return { log_id: logId ?? '', wa_message_id: sent.id, mock: isMock }
}
