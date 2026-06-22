'use client'
// Modal para alterar a função de um membro (manager/receptionist/staff).
// owner não é atribuível por aqui. O trigger protect_last_owner protege o único
// proprietário; o guard de auto-escalada impede mudar a própria função.
import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal }  from '@/components/design-system/Modal/Modal'
import { Button } from '@/components/design-system/Button/Button'
import { alterarRoleMembro, type RoleAtribuivel } from '@/services/equipa'

const OPCOES: Array<{ value: RoleAtribuivel; label: string; desc: string }> = [
  { value: 'manager',      label: 'Gestor',        desc: 'Agenda, clientes, serviços, recursos e relatórios' },
  { value: 'receptionist', label: 'Recepcionista', desc: 'Agenda, clientes e conversas' },
  { value: 'staff',        label: 'Colaborador',   desc: 'Apenas a sua própria agenda' },
]

interface Props {
  isOpen:    boolean
  onClose:   () => void
  membro:    { id: string; full_name: string | null; role: string } | null
}

// O componente pai passa key={membro.id} para remontar com estado fresco por
// membro — evita sincronizar estado via useEffect (cascading renders).
export function AlterarRoleModal({ isOpen, onClose, membro }: Props) {
  const qc = useQueryClient()
  const inicial: RoleAtribuivel =
    membro?.role === 'manager' || membro?.role === 'staff' ? membro.role : 'receptionist'
  const [role, setRole] = useState<RoleAtribuivel>(inicial)

  const mut = useMutation({
    mutationFn: () => alterarRoleMembro(membro!.id, role),
    onSuccess:  () => { void qc.invalidateQueries({ queryKey: ['equipa'] }); onClose() },
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Função de ${membro?.full_name ?? 'membro'}`}
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={mut.isPending}>Cancelar</Button>
          <Button size="sm" onClick={() => mut.mutate()} isLoading={mut.isPending} disabled={mut.isPending}>Guardar</Button>
        </>
      }
    >
      <div className="space-y-2">
        {OPCOES.map((o) => (
          <label
            key={o.value}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              role === o.value ? 'border-[color:var(--tenant-primary)] bg-gray-50' : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name="role"
              checked={role === o.value}
              onChange={() => setRole(o.value)}
              className="mt-0.5"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">{o.label}</p>
              <p className="text-xs text-gray-500">{o.desc}</p>
            </div>
          </label>
        ))}
        {mut.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{(mut.error as Error).message}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
