import React from 'react'
import { cn } from '@/lib/utils/cn'
import type { WhatsAppMessage } from '@/types/domain'

interface MessageBubbleProps {
  message: WhatsAppMessage
}

// timeZone explícito: sem ele, o servidor (UTC) e o cliente (hora local) produzem
// strings diferentes → erro de hidratação. Fixar a zona torna o render determinista.
function formatHour(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Lisbon',
  })
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === 'outbound'

  return (
    <div className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] sm:max-w-[65%] rounded-2xl px-4 py-2.5',
          isOutbound
            ? 'bg-green-600 text-white rounded-br-sm'
            : 'bg-white text-gray-900 rounded-bl-sm border border-gray-200'
        )}
      >
        {/* Conteúdo da mensagem */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content ?? '(sem conteúdo)'}
        </p>

        {/* Rodapé: hora + indicadores */}
        <div
          className={cn(
            'flex items-center gap-1.5 mt-1 text-xs',
            isOutbound ? 'text-green-100 justify-end' : 'text-gray-400'
          )}
        >
          <span>{formatHour(message.created_at)}</span>
          {/* Indicador de IA (apenas para mensagens outbound geradas pela IA) */}
          {isOutbound && message.is_ai_generated && (
            <span className="bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-medium">
              IA
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
