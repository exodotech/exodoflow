'use client'
import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageHeader from '@/components/design-system/PageHeader/PageHeader'
import { ConversationList, ChatWindow } from '@/components/features/whatsapp-simulator'
import { ConversaToolbar } from '@/components/features/whatsapp-simulator/ConversaToolbar'
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from '@/lib/mock-data'
import {
  listarConversasReais, listarMensagensReais, obterEstadoWhatsApp,
  enviarRespostaManual, atribuirConversa, definirStatusConversa, guardarNotaInterna,
  type ConversaStatus,
} from '@/services/whatsapp'
import { listarEquipa } from '@/services/equipa'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/providers/AuthProvider'
import type { WhatsAppMessage } from '@/types/domain'

const JANELA_24H_MS = 24 * 60 * 60 * 1000
type Filtro = 'todas' | 'minhas' | 'nao_atribuidas'

export default function ConversasPage() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  const { can } = usePermissions()
  const podeGerir = can('conversas.reply')   // owner/manager/receptionist; staff não

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const [filtro, setFiltro] = useState<Filtro>('todas')
  // "Agora" para a janela de 24h — inicializado de forma lazy (Date.now() é impuro
  // no corpo do render) e refrescado por intervalo. O servidor é a fonte de
  // verdade da janela; isto só controla o estado do input (UX).
  const [agora, setAgora] = useState<number>(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  const { data: reais = [] } = useQuery({ queryKey: ['wa-conversas-reais'], queryFn: listarConversasReais })
  const { data: estadoCanal } = useQuery({ queryKey: ['whatsapp-estado'], queryFn: obterEstadoWhatsApp })
  const { data: membros = [] } = useQuery({ queryKey: ['equipa'], queryFn: listarEquipa, enabled: podeGerir })
  const temReais = reais.length > 0

  const { data: msgsReais = [] } = useQuery({
    queryKey: ['wa-mensagens-reais', selectedId],
    queryFn:  () => listarMensagensReais(selectedId as string),
    enabled:  temReais && !!selectedId,
  })

  // Filtro por atribuição (só no modo real)
  const conversasFiltradas = !temReais ? MOCK_CONVERSATIONS : reais.filter((c) => {
    if (filtro === 'minhas') return c.assigned_to === profile?.id
    if (filtro === 'nao_atribuidas') return !c.assigned_to
    return true
  })

  const selectedConversation = selectedId
    ? ((temReais ? reais : MOCK_CONVERSATIONS).find((c) => c.id === selectedId) ?? null)
    : null

  const selectedMessages: WhatsAppMessage[] = !selectedId ? []
    : temReais ? msgsReais : (MOCK_MESSAGES[selectedId] ?? [])

  // ── Janela de 24h (UX; o servidor reforça) ──────────────────────────────────
  const ultimaInbound = [...selectedMessages].reverse().find((m) => m.direction === 'inbound')
  const dentroJanela = agora > 0 && !!ultimaInbound && (agora - new Date(ultimaInbound.created_at).getTime() < JANELA_24H_MS)
  const canalActivo = estadoCanal?.is_active === true
  const fechada = selectedConversation?.status === 'archived'
  const canSend = temReais && podeGerir && canalActivo && dentroJanela && !fechada
  const blockedReason =
    !canalActivo ? 'WhatsApp não configurado — ligue o canal para responder.'
    : fechada ? 'Conversa fechada — reabra para responder.'
    : !dentroJanela ? 'Fora da janela de 24h. Use template aprovado na próxima fase.'
    : !podeGerir ? 'Sem permissão para responder.'
    : undefined

  // ── Mutações ────────────────────────────────────────────────────────────────
  const refMsgs = () => { void qc.invalidateQueries({ queryKey: ['wa-mensagens-reais', selectedId] }) }
  const refConv = () => { void qc.invalidateQueries({ queryKey: ['wa-conversas-reais'] }) }

  const enviar  = useMutation({ mutationFn: (texto: string) => enviarRespostaManual(selectedId as string, texto), onSuccess: () => { refMsgs(); refConv() } })
  const atribuir = useMutation({ mutationFn: (pid: string | null) => atribuirConversa(selectedId as string, pid), onSuccess: refConv })
  const mudarStatus = useMutation({ mutationFn: (s: ConversaStatus) => definirStatusConversa(selectedId as string, s), onSuccess: refConv })
  const guardarNota = useMutation({ mutationFn: (n: string) => guardarNotaInterna(selectedId as string, n), onSuccess: refConv })

  function handleSelect(id: string) { setSelectedId(id); setMobileView('chat') }
  function handleBack() { setMobileView('list') }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Conversas WhatsApp"
        description={temReais ? 'WhatsApp real — resposta manual' : 'Simulador — estrutura idêntica ao webhook real da Meta API'}
      />

      {/* Banner */}
      {temReais ? (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
          <span className="mt-0.5 text-base">💬</span>
          <div className="text-xs text-green-800">
            <p className="font-semibold">{canalActivo ? 'WhatsApp real ativo — resposta manual' : 'WhatsApp real ainda não configurado'}</p>
            <p className="mt-0.5 text-green-700">
              Conversas reais. Responde manualmente dentro da janela de 24h. Sem automações nem IA.
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <span className="mt-0.5 text-base">🧪</span>
          <div className="text-xs text-amber-800">
            <p className="font-semibold">Modo SIMULADOR — o WhatsApp real ainda não está ligado.</p>
            <p className="mt-0.5 text-amber-700">As conversas abaixo são mensagens de exemplo, não são reais.</p>
          </div>
        </div>
      )}

      {/* Filtro por atribuição (modo real) */}
      {temReais && podeGerir && (
        <div className="mb-3 flex gap-2">
          {([['todas','Todas'],['minhas','Minhas'],['nao_atribuidas','Não atribuídas']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setFiltro(v)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${filtro === v ? 'bg-[color:var(--tenant-primary)] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-1 gap-0 border border-gray-200 rounded-lg overflow-hidden bg-white min-h-[600px]">
        <div className={`w-full md:w-80 md:flex-shrink-0 border-r border-gray-200 ${mobileView === 'chat' ? 'hidden md:flex md:flex-col' : 'flex flex-col'}`}>
          <ConversationList conversations={conversasFiltradas} selectedId={selectedId} onSelect={handleSelect} />
        </div>

        <div className={`flex-1 flex flex-col ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
          {/* Toolbar de gestão (modo real, conversa selecionada) */}
          {temReais && selectedConversation && (
            <ConversaToolbar
              assignedTo={selectedConversation.assigned_to}
              status={selectedConversation.status}
              notes={selectedConversation.internal_notes ?? ''}
              members={membros.map((m) => ({ id: m.id, name: m.full_name ?? '(sem nome)' }))}
              currentUserId={profile?.id ?? ''}
              podeGerir={podeGerir}
              onAssign={(pid) => atribuir.mutate(pid)}
              onStatus={(s) => mudarStatus.mutate(s)}
              onSaveNote={(n) => guardarNota.mutate(n)}
              pendingAssign={atribuir.isPending}
              pendingStatus={mudarStatus.isPending}
              pendingNote={guardarNota.isPending}
            />
          )}
          <ChatWindow
            conversation={selectedConversation}
            messages={selectedMessages}
            onBack={handleBack}
            reply={temReais ? { canSend, blockedReason, onSend: (t) => enviar.mutateAsync(t) } : undefined}
          />
        </div>
      </div>
    </div>
  )
}
