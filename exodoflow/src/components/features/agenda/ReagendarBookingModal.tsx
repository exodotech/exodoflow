'use client'
import React, { useState } from 'react'
import { Clock, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { Modal }              from '@/components/design-system/Modal/Modal'
import { Button }             from '@/components/design-system/Button/Button'
import LoadingState           from '@/components/design-system/LoadingState/LoadingState'
import { useRecursos }        from '@/hooks/useRecursos'
import { useReagendarBooking } from '@/hooks/useBookings'
import { useDisponibilidade } from '@/hooks/useDisponibilidade'
import { useAuth }            from '@/providers/AuthProvider'
import type { BookingWithRelations } from '@/types/domain/booking'
import type { SlotDisponivel }       from '@/services/disponibilidade'

interface ReagendarBookingModalProps {
  isOpen:   boolean
  onClose:  () => void
  booking:  BookingWithRelations
}

type Step = 1 | 2

interface Selecao {
  date:        string
  resource_id: string
  slot:        SlotDisponivel | null
}

const SEL_INICIAL: Selecao = { date: '', resource_id: '', slot: null }

export function ReagendarBookingModal({
  isOpen,
  onClose,
  booking,
}: ReagendarBookingModalProps) {
  const { tenant }    = useAuth()
  const reagendar     = useReagendarBooking()
  const { data: recursos = [] } = useRecursos()

  const [step, setStep] = useState<Step>(1)
  const [sel, setSel]   = useState<Selecao>(SEL_INICIAL)
  const [erro, setErro] = useState<string | null>(null)

  const settings     = tenant?.settings as { timezone?: string; slot_interval_minutes?: number } | null
  const timezone     = settings?.timezone ?? 'Europe/Lisbon'
  const slotInterval = settings?.slot_interval_minutes ?? 15
  const tenantId     = tenant?.id ?? ''

  const serviceDuration = booking.service?.duration_minutes ?? 60

  const slotsParams =
    sel.resource_id && sel.date && tenantId
      ? {
          tenant_id:             tenantId,
          resource_ids:          [sel.resource_id],
          service_id:            booking.service_id,
          start_date:            sel.date,
          end_date:              sel.date,
          slot_interval_minutes: slotInterval,
        }
      : null

  const { data: slots = [], isLoading: loadingSlots, error: erroSlots } =
    useDisponibilidade(step === 2 ? slotsParams : null)

  const selectedResource = recursos.find((r) => r.id === sel.resource_id)
  const currentResource  = booking.resources?.[0]

  function reset() {
    setStep(1)
    setSel(SEL_INICIAL)
    setErro(null)
    reagendar.reset()
  }

  function handleClose() {
    reset()
    onClose()
  }

  function avancar() {
    setErro(null)
    if (step === 1) {
      if (!sel.date)        { setErro('Seleccione uma data');    return }
      if (!sel.resource_id) { setErro('Seleccione um recurso'); return }
    }
    setStep(2)
  }

  async function handleConfirmar() {
    if (!sel.slot) { setErro('Seleccione um horário'); return }
    setErro(null)
    try {
      await reagendar.mutateAsync({
        id: booking.id,
        input: {
          start_at:     sel.slot.slot_start,
          end_at:       sel.slot.slot_end,
          resource_ids: [sel.slot.resource_id],
        },
      })
      reset()
      onClose()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao reagendar marcação')
    }
  }

  function formatarHora(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-PT', {
      timeZone: timezone,
      hour:     '2-digit',
      minute:   '2-digit',
    })
  }

  const hoje = new Date().toISOString().split('T')[0]

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Reagendar Marcação"
      size="md"
      footer={
        <div className="flex w-full gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={step === 1 ? handleClose : () => { setStep(1); setErro(null) }}
            disabled={reagendar.isPending}
          >
            {step === 1 ? 'Cancelar' : <><ChevronLeft className="w-4 h-4" /> Anterior</>}
          </Button>
          <div className="flex-1" />
          {step === 1 ? (
            <Button size="sm" onClick={avancar} className="flex items-center gap-1">
              Ver horários <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleConfirmar}
              isLoading={reagendar.isPending}
              disabled={reagendar.isPending || !sel.slot}
              className="flex items-center gap-1"
            >
              <Check className="w-4 h-4" />
              Confirmar
            </Button>
          )}
        </div>
      }
    >
      {/* Marcação actual */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
        <span className="font-medium text-gray-800">{booking.service?.name}</span>
        {' — '}
        {new Date(booking.start_at).toLocaleString('pt-PT', {
          timeZone: timezone, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        })}
        {currentResource && <span className="ml-2 text-gray-500">({currentResource.name})</span>}
      </div>

      {/* ── Passo 1: Data e Recurso ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nova data <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              min={hoje}
              value={sel.date}
              onChange={(e) => setSel((s) => ({ ...s, date: e.target.value, slot: null }))}
              className="w-full h-12 rounded-lg border border-gray-300 px-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recurso / Profissional <span className="text-red-600">*</span>
            </label>
            <select
              value={sel.resource_id}
              onChange={(e) => setSel((s) => ({ ...s, resource_id: e.target.value, slot: null }))}
              className="w-full h-12 rounded-lg border border-gray-300 px-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar recurso...</option>
              {recursos.filter((r) => r.is_active).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}{r.id === currentResource?.id ? ' (actual)' : ''}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-gray-400">
            Serviço: {booking.service?.name} ({serviceDuration} min)
          </p>
        </div>
      )}

      {/* ── Passo 2: Horários ── */}
      {step === 2 && (
        <div>
          <p className="text-sm text-gray-600 mb-3">
            {selectedResource?.name} —{' '}
            {new Date(sel.date + 'T12:00:00').toLocaleDateString('pt-PT', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </p>

          {loadingSlots && <LoadingState message="A verificar disponibilidade..." />}

          {erroSlots && !loadingSlots && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">
                {erroSlots instanceof Error ? erroSlots.message : 'Erro ao verificar disponibilidade'}
              </p>
            </div>
          )}

          {!loadingSlots && !erroSlots && slots.length === 0 && (
            <div className="text-center py-8">
              <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Sem horários disponíveis neste dia</p>
              <p className="text-xs text-gray-400 mt-1">Tente outra data ou outro recurso.</p>
            </div>
          )}

          {!loadingSlots && !erroSlots && slots.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
              {slots.map((slot) => {
                const isSelected =
                  sel.slot?.slot_start === slot.slot_start &&
                  sel.slot?.resource_id === slot.resource_id
                return (
                  <button
                    key={`${slot.resource_id}-${slot.slot_start}`}
                    onClick={() => { setSel((s) => ({ ...s, slot })); setErro(null) }}
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
          )}
        </div>
      )}

      {erro && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{erro}</p>
        </div>
      )}
    </Modal>
  )
}

export default ReagendarBookingModal
