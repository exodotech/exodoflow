'use client'
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, XCircle } from 'lucide-react'
import SectionHeader from '@/components/design-system/SectionHeader/SectionHeader'
import { Button }    from '@/components/design-system/Button/Button'
import { listarCanaisComunicacao } from '@/services/communication'
import type { CommunicationChannel } from '@/types/domain'

const CHANNEL_LABELS: Record<CommunicationChannel, string> = {
  whatsapp: 'WhatsApp',
  sms:      'SMS',
  email:    'E-mail',
}

export function PainelComunicacao() {
  const { data: canais = [], isLoading: loadingCanais } = useQuery({
    queryKey: ['communication_channels'],
    queryFn:  listarCanaisComunicacao,
  })

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SectionHeader title="Canais de Comunicação" />
        <p className="text-sm text-gray-500 mt-1 mb-4">
          Canais disponíveis para envio de notificações. A integração real será activada em fases futuras.
        </p>

        {loadingCanais ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : canais.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Nenhum canal configurado.</p>
        ) : (
          <div className="space-y-3">
            {canais.map((canal) => (
              <div
                key={canal.id}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${canal.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {CHANNEL_LABELS[canal.channel]}
                    </p>
                    <p className="text-xs text-gray-500">
                      {canal.is_active ? 'Activo' : 'Inactivo — integração em breve'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canal.is_active ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-gray-300" />
                  )}
                  <Button size="sm" disabled>Configurar</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SectionHeader title="Como funciona" />
        <div className="mt-4 space-y-3">
          {[
            { icon: '📋', label: 'Registo', desc: 'Todas as comunicações são registadas com status "simulado".' },
            { icon: '💬', label: 'Templates', desc: 'Mensagens interpolam dados reais (nome, data, hora, serviço).' },
            { icon: '🔌', label: 'Integração futura', desc: 'WhatsApp, SMS e e-mail reais serão activados progressivamente.' },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-3">
              <span className="text-lg">{item.icon}</span>
              <div>
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
