// Serviço de acesso a dados — Motor de Comunicação
// Fase actual: fundação arquitectural — sem envio real
// Regra: NÃO integrar WhatsApp real / SMS real / Email real nesta fase
import { createClient }  from '@/lib/supabase/client'
import { getTenantId }   from '@/lib/supabase/getTenantId'
import type {
  CommunicationChannelConfig,
  CommunicationTemplate,
  CommunicationLog,
  CriarCommunicationLogInput,
  CommunicationEventType,
  TemplateContext,
} from '@/types/domain/communication'

// Busca todos os canais configurados do tenant
export async function listarCanaisComunicacao(): Promise<CommunicationChannelConfig[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('communication_channels')
    .select('*')
    .order('channel', { ascending: true })

  if (error) throw new Error(`Erro ao listar canais: ${error.message}`)
  return (data ?? []) as CommunicationChannelConfig[]
}

// Busca todos os templates activos do tenant
export async function listarTemplatesComunicacao(): Promise<CommunicationTemplate[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('communication_templates')
    .select('*')
    .eq('is_active', true)
    .order('channel', { ascending: true })

  if (error) throw new Error(`Erro ao listar templates: ${error.message}`)
  return (data ?? []) as CommunicationTemplate[]
}

// Cria um registo de log de comunicação
export async function criarLogComunicacao(
  input: CriarCommunicationLogInput
): Promise<CommunicationLog> {
  const supabase  = createClient()
  const tenant_id = await getTenantId()

  const { data, error } = await supabase
    .from('communication_logs')
    .insert({
      tenant_id,
      booking_id:  input.booking_id,
      client_id:   input.client_id,
      channel:     input.channel,
      event_type:  input.event_type,
      template_id: input.template_id,
      recipient:   input.recipient,
      body:        input.body,
      status:      input.status,
    })
    .select()
    .single()

  if (error) throw new Error(`Erro ao criar log de comunicação: ${error.message}`)
  return data as CommunicationLog
}

// Interpola placeholders {{key}} no corpo de um template
// Ex: "Olá {{nome}}" + { nome: "Ana" } → "Olá Ana"
export function prepararMensagemTemplate(body: string, context: TemplateContext): string {
  return body.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const val = (context as unknown as Record<string, string | undefined>)[key]
    return val ?? match
  })
}

// Simula o envio de uma comunicação — apenas cria o log com status 'simulated'
// Esta função NÃO envia nada — é a implementação correcta para esta fase
export async function simularEnvioComunicacao(params: {
  event_type:   CommunicationEventType
  booking_id:   string | null
  client_id:    string | null
  recipient:    string
  context:      TemplateContext
  templates:    CommunicationTemplate[]
}): Promise<CommunicationLog | null> {
  // Tenta encontrar template WhatsApp (canal prioritário) ou SMS ou email
  const priority: Array<CommunicationTemplate['channel']> = ['whatsapp', 'sms', 'email']
  let template: CommunicationTemplate | undefined

  for (const ch of priority) {
    template = params.templates.find(
      (t) => t.event_type === params.event_type && t.channel === ch && t.is_active
    )
    if (template) break
  }

  // Sem template configurado — não há nada a simular
  if (!template) return null

  const body = prepararMensagemTemplate(template.body, params.context)

  return criarLogComunicacao({
    booking_id:  params.booking_id,
    client_id:   params.client_id,
    channel:     template.channel,
    event_type:  params.event_type,
    template_id: template.id,
    recipient:   params.recipient,
    body,
    status:      'simulated',
  })
}
