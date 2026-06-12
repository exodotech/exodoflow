'use client'
import React from 'react'
import { Clock } from 'lucide-react'
import LoadingState from '@/components/design-system/LoadingState/LoadingState'
import type { SlotDisponivel } from '@/services/disponibilidade'

interface StepHorariosProps {
  pronto:            boolean   // true quando resource_id, service_id e date estão preenchidos
  loadingSlots:      boolean
  erroSlots:         Error | null
  slots:             SlotDisponivel[]
  slotSelecionado:   SlotDisponivel | null
  dataSelecionada:   string
  nomeRecurso:       string | undefined
  formatarHora:      (iso: string) => string
  onSelecionarSlot:  (slot: SlotDisponivel) => void
  onLimparErro:      () => void
}

export function StepHorarios({
  pronto,
  loadingSlots,
  erroSlots,
  slots,
  slotSelecionado,
  dataSelecionada,
  nomeRecurso,
  formatarHora,
  onSelecionarSlot,
  onLimparErro,
}: StepHorariosProps) {
  if (!pronto) {
    return (
      <p className="text-sm text-gray-500 text-center py-6">
        Preencha a data e o recurso no passo anterior.
      </p>
    )
  }

  if (loadingSlots) {
    return <LoadingState message="A verificar disponibilidade..." />
  }

  if (erroSlots) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-700">
          {erroSlots instanceof Error ? erroSlots.message : 'Erro ao verificar disponibilidade'}
        </p>
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-700">Sem horários disponíveis</p>
        <p className="text-xs text-gray-500 mt-1">
          Sem disponibilidade para{' '}
          {new Date(dataSelecionada + 'T12:00:00').toLocaleDateString('pt-PT', {
            weekday: 'long', day: 'numeric', month: 'long',
          })}.
        </p>
        <p className="text-xs text-gray-400 mt-1">Tente outra data ou outro recurso.</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        {slots.length} horário(s) disponível(eis) em {nomeRecurso}
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
        {slots.map((slot) => {
          const isSelected =
            slotSelecionado?.slot_start === slot.slot_start &&
            slotSelecionado?.resource_id === slot.resource_id
          return (
            <button
              key={`${slot.resource_id}-${slot.slot_start}`}
              onClick={() => { onSelecionarSlot(slot); onLimparErro() }}
              className={`py-2.5 px-1 rounded-lg text-sm font-medium transition-colors text-center ${
                isSelected
                  ? 'bg-[color:var(--tenant-primary)] text-white ring-2 ring-gray-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              {formatarHora(slot.slot_start)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
