'use client'
// Modal de cliente — cria um novo OU edita um existente (modo dual).
// Quando recebe `cliente`, entra em modo edição.
import React, { useEffect } from 'react'
import { UserPlus, Save } from 'lucide-react'
import { useFormWithZod }   from '@/hooks/useFormWithZod'
import { useCriarCliente, useAtualizarCliente } from '@/hooks/useClientes'
import { criarClienteSchema, type CriarClienteInput } from '@/lib/validators/client'
import { MARKETING_CONSENT_TEXT, OPERATIONAL_COMMS_NOTE } from '@/lib/consent'
import { Modal }   from '@/components/design-system/Modal/Modal'
import { Button }  from '@/components/design-system/Button/Button'
import { Input }   from '@/components/design-system/Input/Input'

// Forma mínima do cliente para edição (vinda de buscarClientePorId)
export interface ClienteEditavel {
  id: string
  full_name: string
  phone?: string | null
  email?: string | null
  nif?: string | null
  marketing_consent?: boolean | null
}

interface NovoClienteModalProps {
  isOpen:   boolean
  onClose:  () => void
  cliente?: ClienteEditavel | null   // presente = modo edição
  onSuccess?: () => void
}

export function NovoClienteModal({ isOpen, onClose, cliente, onSuccess }: NovoClienteModalProps) {
  const modoEdicao  = !!cliente
  const criar       = useCriarCliente()
  const atualizar   = useAtualizarCliente()

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useFormWithZod(criarClienteSchema, {
    defaultValues: { marketing_consent: false },
  })

  useEffect(() => {
    if (!isOpen) return
    if (cliente) {
      reset({
        full_name:         cliente.full_name,
        phone:             cliente.phone ?? '',
        email:             cliente.email ?? '',
        nif:               cliente.nif ?? '',
        marketing_consent: cliente.marketing_consent ?? false,
      })
    } else {
      reset({ marketing_consent: false })
    }
  }, [isOpen, cliente, reset])

  async function onSubmit(data: CriarClienteInput) {
    if (modoEdicao && cliente) {
      await atualizar.mutateAsync({ id: cliente.id, input: data })
    } else {
      await criar.mutateAsync(data)
    }
    reset()
    onSuccess?.()
    onClose()
  }

  function handleClose() {
    reset()
    criar.reset()
    atualizar.reset()
    onClose()
  }

  const erroMut = (modoEdicao ? atualizar.error : criar.error) as Error | null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={modoEdicao ? 'Editar Cliente' : 'Novo Cliente'}
      size="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={handleClose} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" form="form-cliente" size="sm" isLoading={isSubmitting} disabled={isSubmitting}>
            {modoEdicao ? <Save className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            Guardar
          </Button>
        </>
      }
    >
      <form id="form-cliente" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input label="Nome completo" required placeholder="Maria Oliveira" error={errors.full_name?.message} {...register('full_name')} />
        <Input label="Telefone" type="tel" placeholder="+351 912 345 678" error={errors.phone?.message} {...register('phone')} />
        <Input label="E-mail" type="email" placeholder="cliente@email.pt" error={errors.email?.message} {...register('email')} />
        <Input label="NIF / CPF" placeholder="123456789" error={errors.nif?.message} {...register('nif')} />

        {/* Consentimento de MARKETING (RGPD/LGPD) — opcional, nunca bloqueia.
            Alterar aqui grava um novo registo imutável em legal_consents (trigger). */}
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
          <div className="flex items-start gap-3">
            <input
              id="marketing_consent"
              type="checkbox"
              className="w-4 h-4 mt-0.5 rounded border-gray-300 text-[color:var(--tenant-primary)] focus:ring-[color:var(--tenant-primary)]"
              {...register('marketing_consent')}
            />
            <label htmlFor="marketing_consent" className="text-sm text-gray-700 cursor-pointer">
              {MARKETING_CONSENT_TEXT}
            </label>
          </div>
          <p className="text-xs text-gray-500 pl-7">{OPERATIONAL_COMMS_NOTE}</p>
        </div>

        {erroMut && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{erroMut.message}</p>
          </div>
        )}
      </form>
    </Modal>
  )
}
