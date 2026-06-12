'use client'
import React from 'react'
import type { SlotDisponivel } from '@/services/disponibilidade'

interface ClienteSimples  { full_name: string }
interface ServicoSimples  { name: string; duration_minutes: number }
interface RecursoSimples  { name: string }

interface StepConfirmacaoProps {
  cliente:       ClienteSimples  | undefined
  servico:       ServicoSimples  | undefined
  recurso:       RecursoSimples  | undefined
  date:          string
  slot:          SlotDisponivel | null
  notes:         string
  formatarHora:  (iso: string) => string
  onNotesChange: (notes: string) => void
}

export function StepConfirmacao({
  cliente,
  servico,
  recurso,
  date,
  slot,
  notes,
  formatarHora,
  onNotesChange,
}: StepConfirmacaoProps) {
  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Cliente</span>
          <span className="font-medium">{cliente?.full_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Serviço</span>
          <span className="font-medium">
            {servico?.name}
            {servico && <span className="text-gray-500"> ({servico.duration_minutes} min)</span>}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Recurso</span>
          <span className="font-medium">{recurso?.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Data</span>
          <span className="font-medium">
            {new Date(date + 'T12:00:00').toLocaleDateString('pt-PT', {
              weekday: 'short', day: 'numeric', month: 'long',
            })}
          </span>
        </div>
        {slot && (
          <div className="flex justify-between">
            <span className="text-gray-600">Horário</span>
            <span className="font-medium">
              {formatarHora(slot.slot_start)} – {formatarHora(slot.slot_end)}
            </span>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notas (opcional)
        </label>
        <textarea
          rows={3}
          maxLength={500}
          placeholder="Informações adicionais para esta marcação..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  )
}
