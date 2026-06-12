'use client'
// Barra de gestão de uma conversa real (Fase 1B): atribuição, estado e notas
// internas. Sem IA. As notas NÃO são enviadas ao WhatsApp — só a equipa vê.
import React, { useState } from 'react'
import { UserCheck, StickyNote, Save } from 'lucide-react'
import { Button } from '@/components/design-system/Button/Button'
import type { ConversaStatus } from '@/services/whatsapp'

interface Membro { id: string; name: string }

interface Props {
  assignedTo:   string | null
  status:       string
  notes:        string
  members:      Membro[]
  currentUserId: string
  podeGerir:    boolean
  onAssign:    (profileId: string | null) => void
  onStatus:    (status: ConversaStatus) => void
  onSaveNote:  (notes: string) => void
  pendingAssign?: boolean
  pendingStatus?: boolean
  pendingNote?:   boolean
}

const STATUS_OPCOES: { value: ConversaStatus; label: string }[] = [
  { value: 'active',   label: 'Aberta' },
  { value: 'waiting',  label: 'Pendente' },
  { value: 'resolved', label: 'Resolvida' },
  { value: 'archived', label: 'Fechada' },
]

export function ConversaToolbar(p: Props) {
  const [notasOpen, setNotasOpen] = useState(false)
  const [notasDraft, setNotasDraft] = useState(p.notes)

  if (!p.podeGerir) {
    return (
      <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 text-xs text-gray-400">
        Apenas proprietário, gestor ou recepcionista podem gerir conversas.
      </div>
    )
  }

  return (
    <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Atribuição */}
        <div className="flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={p.assignedTo ?? ''}
            onChange={(e) => p.onAssign(e.target.value || null)}
            disabled={p.pendingAssign}
            className="h-8 px-2 rounded-lg border border-gray-300 text-xs text-gray-700 bg-white"
          >
            <option value="">Não atribuída</option>
            {p.members.map((m) => (
              <option key={m.id} value={m.id}>{m.id === p.currentUserId ? `${m.name} (eu)` : m.name}</option>
            ))}
          </select>
        </div>

        {/* Estado */}
        <select
          value={STATUS_OPCOES.some((s) => s.value === p.status) ? p.status : 'active'}
          onChange={(e) => p.onStatus(e.target.value as ConversaStatus)}
          disabled={p.pendingStatus}
          className="h-8 px-2 rounded-lg border border-gray-300 text-xs text-gray-700 bg-white"
        >
          {STATUS_OPCOES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        {/* Notas internas (toggle) */}
        <button
          type="button"
          onClick={() => { setNotasDraft(p.notes); setNotasOpen((v) => !v) }}
          className="inline-flex items-center gap-1 h-8 px-2 rounded-lg border border-gray-300 text-xs text-gray-700 bg-white hover:bg-gray-50"
        >
          <StickyNote className="w-3.5 h-3.5" /> Notas{p.notes ? ' •' : ''}
        </button>
      </div>

      {notasOpen && (
        <div className="space-y-2">
          <textarea
            value={notasDraft}
            onChange={(e) => setNotasDraft(e.target.value)}
            rows={2}
            placeholder="Notas internas (não enviadas ao cliente)…"
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => p.onSaveNote(notasDraft)} isLoading={p.pendingNote} className="gap-1">
              <Save className="w-3.5 h-3.5" /> Guardar nota
            </Button>
            <span className="text-[11px] text-gray-400">Visível só para a equipa.</span>
          </div>
        </div>
      )}
    </div>
  )
}
