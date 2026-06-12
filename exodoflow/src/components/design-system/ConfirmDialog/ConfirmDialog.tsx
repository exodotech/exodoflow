'use client'
// Diálogo de confirmação reutilizável (ex: apagar serviço/recurso).
// Bloqueia a acção destrutiva atrás de uma confirmação explícita.
import React from 'react'
import { Modal }  from '@/components/design-system/Modal/Modal'
import { Button } from '@/components/design-system/Button/Button'

interface ConfirmDialogProps {
  isOpen:        boolean
  onClose:       () => void
  onConfirm:     () => void
  title:         string
  description?:  string
  confirmLabel?: string
  cancelLabel?:  string
  isLoading?:    boolean
  variant?:      'danger' | 'primary'
  error?:        string | null
}

export function ConfirmDialog({
  isOpen, onClose, onConfirm,
  title, description,
  confirmLabel = 'Confirmar',
  cancelLabel  = 'Cancelar',
  isLoading = false,
  variant = 'danger',
  error,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
            disabled={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description && <p className="text-sm text-gray-600">{description}</p>}
      {error && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </Modal>
  )
}

export default ConfirmDialog
