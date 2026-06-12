'use client'
// Modal de "Cliente rápido" (visitante): cadastro mínimo — só nome + telefone.
// Não pede e-mail, NIF/CPF nem consentimento de marketing (RGPD: não se cria
// consentimento que o cliente não deu). Pode ser convertido em permanente depois.
import React from 'react'
import { UserPlus } from 'lucide-react'
import { useFormWithZod } from '@/hooks/useFormWithZod'
import { useCriarVisitante } from '@/hooks/useClientes'
import { criarVisitanteSchema, type CriarVisitanteInput } from '@/lib/validators/client'
import { Modal }  from '@/components/design-system/Modal/Modal'
import { Button } from '@/components/design-system/Button/Button'
import { Input }  from '@/components/design-system/Input/Input'

interface ClienteRapidoModalProps {
  isOpen:    boolean
  onClose:   () => void
  // Recebe o visitante criado — útil para o seleccionar logo (ex.: numa marcação)
  onCriado?: (cliente: { id: string; full_name: string }) => void
}

export function ClienteRapidoModal({ isOpen, onClose, onCriado }: ClienteRapidoModalProps) {
  const criar = useCriarVisitante()
  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useFormWithZod(criarVisitanteSchema, { defaultValues: { full_name: '', phone: '' } })

  async function onSubmit(data: CriarVisitanteInput) {
    const novo = await criar.mutateAsync(data)
    reset()
    onCriado?.({ id: novo.id, full_name: novo.full_name })
    onClose()
  }

  function handleClose() { reset(); criar.reset(); onClose() }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Cliente rápido (visitante)"
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={handleClose} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" form="form-visitante" size="sm" isLoading={isSubmitting} disabled={isSubmitting}>
            <UserPlus className="w-4 h-4" /> Criar visitante
          </Button>
        </>
      }
    >
      <form id="form-visitante" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <p className="text-xs text-gray-500">
          Cadastro mínimo para atendimento imediato. Pode completar os dados e
          converter em cliente permanente mais tarde.
        </p>
        <Input label="Nome" required placeholder="Maria (visitante)" error={errors.full_name?.message} {...register('full_name')} />
        <Input label="Telefone (opcional)" type="tel" placeholder="+351 912 345 678" error={errors.phone?.message} {...register('phone')} />

        {criar.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{(criar.error as Error).message}</p>
          </div>
        )}
      </form>
    </Modal>
  )
}
