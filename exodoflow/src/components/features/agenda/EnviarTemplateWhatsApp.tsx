'use client'
// Acções MANUAIS de template WhatsApp por marcação (Fase 1C).
// Sem IA, sem automação: cada envio é desencadeado pela equipa. Se o canal
// WhatsApp não estiver activo, o botão fica desactivado com tooltip explicativo.
import { useState, useRef, useEffect } from 'react'
import { MessageCircle, Check, Loader2 } from 'lucide-react'
import { useEnviarTemplate } from '@/hooks/useWhatsAppTemplates'
import type { TemplatePurpose } from '@/types/domain/communication'

// Os 4 tipos de mensagem operacional (lembrete em duas variantes).
const ACOES: Array<{ purpose: TemplatePurpose; label: string }> = [
  { purpose: 'booking_confirmation', label: 'Confirmação' },
  { purpose: 'booking_reminder_24h', label: 'Lembrete 24h' },
  { purpose: 'booking_reminder_2h',  label: 'Lembrete 2h' },
  { purpose: 'booking_cancellation', label: 'Cancelamento' },
  { purpose: 'booking_reschedule',   label: 'Reagendamento' },
]

interface Props {
  bookingId:    string
  channelAtivo: boolean
}

const BTN_BASE = 'text-xs px-2 py-1 rounded font-medium transition-colors disabled:opacity-50'

export function EnviarTemplateWhatsApp({ bookingId, channelAtivo }: Props) {
  const [aberto, setAberto]     = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const ref    = useRef<HTMLDivElement>(null)
  const enviar = useEnviarTemplate()

  // Fechar o menu ao clicar fora
  useEffect(() => {
    if (!aberto) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [aberto])

  function enviarTemplate(purpose: TemplatePurpose, label: string) {
    setFeedback(null)
    enviar.mutate({ bookingId, purpose }, {
      onSuccess: () => { setFeedback({ tipo: 'ok', texto: `${label} enviado` }); setAberto(false) },
      onError:   (e) => setFeedback({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Falhou' }),
    })
  }

  // Canal inactivo: botão desactivado + tooltip ("WhatsApp não configurado").
  if (!channelAtivo) {
    return (
      <button
        type="button"
        disabled
        title="WhatsApp não configurado"
        className={`${BTN_BASE} bg-gray-100 text-gray-400 cursor-not-allowed inline-flex items-center gap-1`}
      >
        <MessageCircle className="w-3 h-3" /> WhatsApp
      </button>
    )
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        disabled={enviar.isPending}
        aria-haspopup="menu"
        aria-expanded={aberto}
        className={`${BTN_BASE} bg-emerald-100 text-emerald-700 hover:bg-emerald-200 inline-flex items-center gap-1`}
      >
        {enviar.isPending
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : <MessageCircle className="w-3 h-3" />}
        WhatsApp
      </button>

      {aberto && (
        <div role="menu" className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {ACOES.map((a) => (
            <button
              key={a.purpose}
              role="menuitem"
              type="button"
              onClick={() => enviarTemplate(a.purpose, a.label)}
              disabled={enviar.isPending}
              className="block w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-emerald-50 disabled:opacity-50"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      {feedback && (
        <span className={`ml-1 inline-flex items-center gap-1 text-xs ${feedback.tipo === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
          {feedback.tipo === 'ok' && <Check className="w-3 h-3" />}
          {feedback.texto}
        </span>
      )}
    </div>
  )
}
