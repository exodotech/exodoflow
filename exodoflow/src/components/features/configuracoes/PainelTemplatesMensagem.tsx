'use client'
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import SectionHeader from '@/components/design-system/SectionHeader/SectionHeader'
import { Button }    from '@/components/design-system/Button/Button'
import { listarTemplatesComunicacao } from '@/services/communication'
import type { CommunicationChannel } from '@/types/domain'

const CHANNEL_LABELS: Record<CommunicationChannel, string> = {
  whatsapp: 'WhatsApp',
  sms:      'SMS',
  email:    'E-mail',
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  booking_created:      'Nova marcação criada',
  booking_confirmed:    'Marcação confirmada',
  booking_cancelled:    'Marcação cancelada',
  booking_reminder_24h: 'Lembrete 24 horas antes',
  booking_reminder_1h:  'Lembrete 1 hora antes',
  booking_completed:    'Marcação concluída',
  booking_no_show:      'Falta (no-show)',
}

export function PainelTemplatesMensagem() {
  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ['communication_templates'],
    queryFn:  listarTemplatesComunicacao,
  })

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SectionHeader title="Templates de Mensagem" />
        <p className="text-sm text-gray-500 mt-1 mb-4">
          Templates configurados por evento. Placeholders disponíveis:{' '}
          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{'{{nome}}'}</code>{' '}
          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{'{{data}}'}</code>{' '}
          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{'{{hora}}'}</code>{' '}
          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{'{{servico}}'}</code>{' '}
          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{'{{profissional}}'}</code>
        </p>

        {loadingTemplates ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Nenhum template configurado.</p>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <div key={t.id} className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      {CHANNEL_LABELS[t.channel]}
                    </span>
                    <span className="text-xs text-gray-500">
                      {EVENT_TYPE_LABELS[t.event_type] ?? t.event_type}
                    </span>
                    <span className="text-xs text-gray-400">{t.locale}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${t.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <Button size="sm" disabled>Editar</Button>
                  </div>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs font-medium text-gray-700 mb-1">{t.name}</p>
                  <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{t.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
