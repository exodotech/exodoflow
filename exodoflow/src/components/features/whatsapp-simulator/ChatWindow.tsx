'use client'
import React, { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Bot, Send, User } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { MessageBubble } from './MessageBubble'
import type { WhatsAppConversation, WhatsAppConversationStatus, WhatsAppMessage } from '@/types/domain'

const STATUS_LABELS: Record<WhatsAppConversationStatus, string> = {
  active:   'Activa',
  waiting:  'A aguardar',
  resolved: 'Resolvida',
  archived: 'Arquivada',
}

interface ChatWindowProps {
  conversation: WhatsAppConversation | null
  messages: WhatsAppMessage[]
  onBack?: () => void
  // Fase 1B (modo real): se onSend existir, mostra o input de resposta humana.
  reply?: {
    canSend:        boolean
    blockedReason?: string   // se !canSend, motivo (sem canal / fora da janela / fechada)
    onSend:         (text: string) => Promise<void>
  }
}

export function ChatWindow({ conversation, messages, onBack, reply }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [texto, setTexto]     = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)

  // Rolar para a última mensagem quando as mensagens mudam
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!reply || !texto.trim() || enviando) return
    setErroEnvio(null); setEnviando(true)
    try {
      await reply.onSend(texto.trim())
      setTexto('')
    } catch (e) {
      setErroEnvio(e instanceof Error ? e.message : 'Erro ao enviar')
    } finally {
      setEnviando(false)
    }
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Bot className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Seleccione uma conversa</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header da conversa */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-white">
        {/* Botão voltar — visível apenas em mobile */}
        {onBack && (
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900 md:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-green-700">
            {(conversation.wa_contact_name ?? conversation.wa_phone_number).charAt(0).toUpperCase()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">
            {conversation.wa_contact_name ?? conversation.wa_phone_number}
          </p>
          <p className="text-xs text-gray-500">{STATUS_LABELS[conversation.status]}</p>
        </div>

        {/* Badge de simulação — contexto importante para o utilizador */}
        <span className="text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-medium flex-shrink-0">
          SIMULADOR
        </span>
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">Sem mensagens nesta conversa.</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Área de input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        {!reply ? (
          // Simulador: envio desactivado.
          <fieldset disabled className="m-0 p-0 border-0">
            <div className={cn('flex items-center gap-3 rounded-full border border-gray-200', 'bg-gray-100 px-4 py-3 cursor-not-allowed')}>
              <span className="text-sm text-gray-400 flex-1">Resposta manual será ativada na próxima fase.</span>
              <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Em breve</span>
            </div>
          </fieldset>
        ) : reply.canSend ? (
          // Modo real: resposta HUMANA dentro da janela de 24h.
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <User className="w-3.5 h-3.5" /> Resposta humana
            </div>
            <div className="flex items-end gap-2">
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend() } }}
                rows={1}
                maxLength={4096}
                placeholder="Escreva uma resposta…"
                className="flex-1 resize-none rounded-2xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--tenant-primary)]"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={enviando || !texto.trim()}
                className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full bg-[color:var(--tenant-primary)] text-white disabled:opacity-40"
                aria-label="Enviar"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {erroEnvio && <p className="text-xs text-red-600">{erroEnvio}</p>}
          </div>
        ) : (
          // Modo real mas bloqueado (sem canal / fora da janela / conversa fechada).
          <fieldset disabled className="m-0 p-0 border-0">
            <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 cursor-not-allowed">
              <span className="text-sm text-amber-800 flex-1">
                {reply.blockedReason ?? 'Resposta indisponível.'}
              </span>
            </div>
          </fieldset>
        )}
      </div>
    </div>
  )
}
