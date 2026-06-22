'use client'
// Modal de serviço — cria um novo OU edita um existente (modo dual).
// Quando recebe `servico`, entra em modo edição (pré-preenche + chama atualizar).
import React, { useEffect } from 'react'
import { Plus, Save }       from 'lucide-react'
import { useFormWithZod }   from '@/hooks/useFormWithZod'
import { useCriarServico, useAtualizarServico } from '@/hooks/useServicos'
import { criarServicoSchema, type CriarServicoInput } from '@/lib/validators/service'
import { Modal }  from '@/components/design-system/Modal/Modal'
import { Button } from '@/components/design-system/Button/Button'
import { Input }  from '@/components/design-system/Input/Input'
import type { ResourceType } from '@/types/domain/resource'
import type { Service }      from '@/types/domain/service'

const TIPOS_RECURSO: Array<{ value: ResourceType; label: string }> = [
  { value: 'staff',     label: 'Colaborador' },
  { value: 'room',      label: 'Sala/Cabine' },
  { value: 'equipment', label: 'Equipamento' },
]

interface ServicoModalProps {
  isOpen:     boolean
  onClose:    () => void
  servico?:   Service | null   // presente = modo edição
  onSuccess?: () => void
}

export function ServicoModal({ isOpen, onClose, servico, onSuccess }: ServicoModalProps) {
  const modoEdicao = !!servico
  const criar     = useCriarServico()
  const atualizar = useAtualizarServico()

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useFormWithZod(criarServicoSchema, {
    defaultValues: { color: '#6366f1', price: undefined },
  })

  // Pré-preencher (edição) ou limpar (criação) sempre que abre/muda o serviço
  useEffect(() => {
    if (!isOpen) return
    if (servico) {
      reset({
        name:                   servico.name,
        description:            servico.description ?? undefined,
        duration_minutes:       servico.duration_minutes,
        price:                  servico.price ?? undefined,
        color:                  servico.color,
        requires_resource_type: servico.requires_resource_type ?? undefined,
      })
    } else {
      reset({ color: '#6366f1', price: undefined })
    }
  }, [isOpen, servico, reset])

  async function onSubmit(data: CriarServicoInput) {
    if (modoEdicao && servico) {
      await atualizar.mutateAsync({ id: servico.id, input: data })
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
      title={modoEdicao ? 'Editar Serviço' : 'Novo Serviço'}
      size="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={handleClose} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" form="form-servico" size="sm" isLoading={isSubmitting} disabled={isSubmitting}>
            {modoEdicao ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            Guardar
          </Button>
        </>
      }
    >
      <form id="form-servico" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input
          label="Nome do serviço"
          required
          placeholder="Limpeza de Pele"
          error={errors.name?.message}
          {...register('name')}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Duração (min) <span className="text-red-600">*</span>
            </label>
            <input
              type="number" min={5} max={480} placeholder="60"
              className="flex h-12 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              {...register('duration_minutes', { valueAsNumber: true })}
            />
            {errors.duration_minutes && <p className="text-sm text-red-600 mt-1">{errors.duration_minutes.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Preço (€)</label>
            <input
              type="number" min={0} step={0.01} placeholder="45.00"
              className="flex h-12 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              {...register('price', { valueAsNumber: true })}
            />
            {errors.price && <p className="text-sm text-red-600 mt-1">{errors.price.message}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Cor</label>
            <input
              type="color"
              className="h-12 w-20 rounded-lg border border-gray-300 cursor-pointer p-1"
              {...register('color')}
            />
          </div>
          {errors.color && <p className="text-sm text-red-600 self-end mb-2">{errors.color.message}</p>}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Requer tipo de recurso</label>
          <select
            className="flex h-12 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            {...register('requires_resource_type')}
          >
            <option value="">Nenhum</option>
            {TIPOS_RECURSO.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
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

export default ServicoModal
