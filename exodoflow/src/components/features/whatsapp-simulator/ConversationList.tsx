'use client'
import React from 'react'
import { cn } from '@/lib/utils/cn'
import type { WhatsAppConversation, WhatsAppConversationStatus } from '@/types/domain'

// Cores e rótulos por estado da conversa
const STATUS_CONFIG: Record<WhatsAppConversationStatus, { label: string; color: string }> = {
  active:   { label: 'Activa',    color: 'bg-green-500' },
  waiting:  { label: 'A aguardar', color: 'bg-yellow-500' },
  resolved: { label: 'Resolvida', color: 'bg-gray-400' },
  archived: { label: 'Arquivada', color: 'bg-gray-300' },
}

interface ConversationListProps {
  conversations: WhatsAppConversation[]
  selectedId: string | null
  onSelect: (id: string) => void
}

// Determinista: NÃO usa new Date() (now), que difere entre servidor e cliente e
// causa erro de hidratação. timeZone fixo torna o resultado igual nos dois lados.
function formatTime(isoString: string | null): string {
  if (!isoString) return ''
  return new Date(isoString).toLocaleDateString('pt-PT', {
    day: '2-digit', month: '2-digit', timeZone: 'Europe/Lisbon',
  })
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: ConversationListProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header da lista */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-900 text-sm">Conversas</h3>
        <p className="text-xs text-gray-500 mt-0.5">{conversations.length} conversas</p>
      </div>

      {/* Lista de conversas */}
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => {
          const status = STATUS_CONFIG[conv.status]
          const isSelected = conv.id === selectedId

          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                'w-full text-left p-4 border-b border-gray-100',
                'hover:bg-gray-50 transition-colors',
                isSelected && 'bg-blue-50 border-l-4 border-l-blue-500'
              )}
            >
              <div className="flex items-start gap-3">
                {/* Avatar com inicial */}
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-gray-600">
                    {(conv.wa_contact_name ?? conv.wa_phone_number).charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {conv.wa_contact_name ?? conv.wa_phone_number}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {formatTime(conv.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn('w-2 h-2 rounded-full flex-shrink-0', status.color)} />
                    <span className="text-xs text-gray-500">{status.label}</span>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
