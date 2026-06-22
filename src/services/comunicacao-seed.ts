// Seed do motor de comunicação para um tenant NOVO — SERVER-SIDE apenas.
// Chamado na criação da empresa (/api/admin/criar-empresa) para que cada tenant
// nasça com os canais (inactivos) e os 5 templates WhatsApp operacionais mapeados
// para a Meta. Sem isto, um cliente real activava o WhatsApp e não tinha nenhum
// template configurado (a migração 0007/0028 só semeia o tenant de exemplo).
//
// Idempotente: usa upsert com ignoreDuplicates (a constraint UNIQUE protege).
// Best-effort: o chamador NÃO deve falhar a criação da empresa se isto falhar.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { SupportedLocale, TemplatePurpose } from '@/types/domain/communication'

type Admin = SupabaseClient<Database>

// Catálogo dos 5 templates operacionais. event_type é o valor na BD; o nome Meta
// (meta_template_name) é o propósito público. variables = ordem dos parâmetros.
interface TemplateSeed {
  purpose:    TemplatePurpose
  event_type: string
  name:       string
  variables:  string[]
  body:       Record<SupportedLocale, string>
}

const CATALOGO: TemplateSeed[] = [
  {
    purpose: 'booking_confirmation', event_type: 'booking_confirmed', name: 'Confirmação',
    variables: ['nome', 'servico', 'data', 'hora'],
    body: {
      'pt-PT': 'Olá {{nome}}! A sua marcação está confirmada: {{servico}} em {{data}} às {{hora}}. Até breve! ✨',
      'pt-BR': 'Olá {{nome}}! Seu agendamento está confirmado: {{servico}} em {{data}} às {{hora}}. Até breve! ✨',
    },
  },
  {
    purpose: 'booking_reminder_24h', event_type: 'booking_reminder_24h', name: 'Lembrete 24h',
    variables: ['nome', 'servico', 'data', 'hora'],
    body: {
      'pt-PT': 'Olá {{nome}}! Lembrete: tem {{servico}} amanhã, {{data}} às {{hora}}. Até amanhã! 😊',
      'pt-BR': 'Olá {{nome}}! Lembrete: você tem {{servico}} amanhã, {{data}} às {{hora}}. Até amanhã! 😊',
    },
  },
  {
    purpose: 'booking_reminder_2h', event_type: 'booking_reminder_2h', name: 'Lembrete 2h',
    variables: ['nome', 'servico', 'hora'],
    body: {
      'pt-PT': 'Olá {{nome}}! Faltam ~2h para o seu {{servico}} às {{hora}}. Até já! 😊',
      'pt-BR': 'Olá {{nome}}! Faltam ~2h para o seu {{servico}} às {{hora}}. Até já! 😊',
    },
  },
  {
    purpose: 'booking_cancellation', event_type: 'booking_cancelled', name: 'Cancelamento',
    variables: ['nome', 'servico', 'data', 'hora'],
    body: {
      'pt-PT': 'Olá {{nome}}, a sua marcação de {{servico}} em {{data}} às {{hora}} foi cancelada. Para reagendar, contacte-nos.',
      'pt-BR': 'Olá {{nome}}, seu agendamento de {{servico}} em {{data}} às {{hora}} foi cancelado. Para reagendar, fale conosco.',
    },
  },
  {
    purpose: 'booking_reschedule', event_type: 'booking_reschedule', name: 'Reagendamento',
    variables: ['nome', 'servico', 'data', 'hora'],
    body: {
      'pt-PT': 'Olá {{nome}}! A sua marcação de {{servico}} foi reagendada para {{data}} às {{hora}}. Até breve! ✨',
      'pt-BR': 'Olá {{nome}}! Seu agendamento de {{servico}} foi reagendado para {{data}} às {{hora}}. Até breve! ✨',
    },
  },
]

// Semeia canais (inactivos) + templates WhatsApp para um tenant novo, no locale dado.
export async function semearComunicacaoTenant(admin: Admin, tenantId: string, locale: SupportedLocale): Promise<void> {
  const metaLang = locale === 'pt-BR' ? 'pt_BR' : 'pt_PT'

  // 1. Canais inactivos (whatsapp/sms/email). A Fase 1D apenas activa + configura.
  await admin
    .from('communication_channels')
    .upsert(
      (['whatsapp', 'sms', 'email'] as const).map((channel) => ({
        tenant_id: tenantId, channel, is_active: false, config: {},
      })),
      { onConflict: 'tenant_id,channel', ignoreDuplicates: true },
    )

  // 2. Templates WhatsApp operacionais mapeados para a Meta (meta_status=PENDING).
  await admin
    .from('communication_templates')
    .upsert(
      CATALOGO.map((t) => ({
        tenant_id:          tenantId,
        channel:            'whatsapp',
        event_type:         t.event_type,
        name:               t.name,
        body:               t.body[locale],
        locale,
        is_active:          true,
        provider:           'meta',
        variables:          t.variables,
        meta_template_name: t.purpose,
        meta_language_code: metaLang,
        meta_category:      'UTILITY',
        meta_status:        'PENDING',
      })),
      { onConflict: 'tenant_id,channel,event_type,locale', ignoreDuplicates: true },
    )
}
