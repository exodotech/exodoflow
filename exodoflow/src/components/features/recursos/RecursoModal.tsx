'use client'
// Modal de recurso — cria um novo OU edita um existente (modo dual).
import React, { useEffect } from 'react'
import { Plus, Save }       from 'lucide-react'
import { useFormWithZod }   from '@/hooks/useFormWithZod'
import { useCriarRecurso, useAtualizarRecurso } from '@/hooks/useRecursos'
import { criarRecursoSchema, type CriarRecursoInput } from '@/lib/validators/resource'
import { Modal }  from '@/components/design-system/Modal/Modal'
import { Button } from '@/components/design-system/Button/Button'
import { Input }  from '@/components/design-system/Input/Input'
import type { Resource, ResourceType } from '@/types/domain/resource'

const TIPOS: Array<{ value: ResourceType; label: string }> = [
  { value: 'staff',     label: 'Colaborador' },
  { value: 'room',      label: 'Sala/Cabine' },
  { value: 'equipment', label: 'Equipamento' },
]

interface RecursoModalProps {
  isOpen:     boolean
  onClose:    () => void
  recurso?:   Resource | null   // presente = modo edição
  onSuccess?: () => void
}

export function RecursoModal({ isOpen, onClose, recurso, onSuccess }: RecursoModalProps) {
  const modoEdicao = !!recurso
  const criar     = useCriarRecurso()
  const atualizar = useAtualizarRecurso()

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useFormWithZod(criarRecursoSchema, {
    defaultValues: { type: 'staff', color: '#6366f1' },
  })

  useEffect(() => {
    if (!isOpen) return
    if (recurso) {
      const spec = (recurso.metadata as Record<string, string> | null)?.specialization ?? ''
      reset({ name: recurso.name, type: recurso.type, color: recurso.color, specialization: spec })
    } else {
      reset({ type: 'staff', color: '#6366f1', name: '', specialization: '' })
    }
  }, [isOpen, recurso, reset])

  async function onSubmit(data: CriarRecursoInput) {
    if (modoEdicao && recurso) {
      await atualizar.mutateAsync({ id: recurso.id, input: data })
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
      title={modoEdicao ? 'Editar Recurso' : 'Novo Recurso'}
      size="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={handleClose} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" form="form-recurso" size="sm" isLoading={isSubmitting} disabled={isSubmitting}>
            {modoEdicao ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            Guardar
          </Button>
        </>
      }
    >
      <form id="form-recurso" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input
          label="Nome do recurso"
          required
          placeholder="Ana Ferreira / Sala 1 / Cadeira 2"
          error={errors.name?.message}
          {...register('name')}
        />

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">
            Tipo <span className="text-red-600">*</span>
          </label>
          <select
            className="flex h-12 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            {...register('type')}
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <Input
          label="Especialização (opcional)"
          placeholder="Esteticista / Massagista"
          error={errors.specialization?.message}
          {...register('specialization')}
        />

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

        {erroMut && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{erroMut.message}</p>
          </div>
        )}
      </form>
    </Modal>
  )
}

export default RecursoModal
