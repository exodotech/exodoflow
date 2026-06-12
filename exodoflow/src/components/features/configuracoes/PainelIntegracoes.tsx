'use client'
import React from 'react'
import { Button } from '@/components/design-system/Button/Button'

const INTEGRACOES = [
  {
    name:        'WhatsApp Business API',
    description: 'Integre com a API oficial da Meta para envio e receção de mensagens reais.',
    logo:        '💬',
  },
  {
    name:        'Supabase',
    description: 'Base de dados e autenticação. Configuração interna do sistema.',
    logo:        '🗄️',
  },
  {
    name:        'Google Calendar',
    description: 'Sincronize marcações com o Google Calendar dos colaboradores.',
    logo:        '📅',
  },
]

export function PainelIntegracoes() {
  return (
    <div className="max-w-2xl space-y-4">
      {INTEGRACOES.map((integration) => (
        <div
          key={integration.name}
          className="bg-white rounded-lg border border-gray-200 p-5 flex items-start gap-4"
        >
          <span className="text-2xl flex-shrink-0">{integration.logo}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{integration.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{integration.description}</p>
          </div>
          <Button size="sm" disabled className="flex-shrink-0">Em breve</Button>
        </div>
      ))}
    </div>
  )
}
