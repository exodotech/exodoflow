'use client'
import React, { useState } from 'react'
import { AlertTriangle }              from 'lucide-react'
import { Modal }                      from '@/components/design-system/Modal/Modal'
import { Button }                     from '@/components/design-system/Button/Button'
import { useAtualizarStatusBooking }  from '@/hooks/useBookings'

interface CancelarBookingModalProps {
  isOpen:      boolean
  onClose:     () => void
  bookingId:   string
  descricao:   string   // ex: "Massagem - Maria Oliveira"
}

export function CancelarBookingModal({
  isOpen,
  onClose,
  bookingId,
  descricao,
}: CancelarBookingModalProps) {
  const cancelar = useAtualizarStatusBooking()
  const [motivo, setMotivo] = useState('')
  const [erro,   setErro]   = useState<string | null>(null)

  function handleClose() {
    setMotivo('')
    setErro(null)
    cancelar.reset()
    onClose()
  }

  async function handleConfirmar() {
    setErro(null)
    try {
      await cancelar.mutateAsync({
        id: bookingId,
        input: {
          status:               'cancelled',
          cancellation_reason:  motivo.trim() || undefined,
        },
      })
      handleClose()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao cancelar marcação')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Cancelar Marcação"
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={handleClose} disabled={cancelar.isPending}>
            Voltar
          </Button>
          <Button
            size="sm"
            onClick={handleConfirmar}
            isLoading={cancelar.isPending}
            disabled={cancelar.isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Confirmar Cancelamento
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-3 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Cancelar marcação?</p>
            <p className="text-sm text-red-700 mt-0.5">{descricao}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Motivo de cancelamento (opcional)
          </label>
          <textarea
            rows={3}
            maxLength={300}
            placeholder="Ex: Cliente cancelou por telefone..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{erro}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default CancelarBookingModal
