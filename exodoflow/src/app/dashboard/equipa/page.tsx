'use client'
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, ShieldOff, UserCog } from 'lucide-react'
import PageHeader    from '@/components/design-system/PageHeader/PageHeader'
import AccessDenied  from '@/components/design-system/AccessDenied/AccessDenied'
import LoadingState  from '@/components/design-system/LoadingState/LoadingState'
import ErrorState    from '@/components/design-system/ErrorState/ErrorState'
import { Badge }     from '@/components/design-system/Badge/Badge'
import { Button }    from '@/components/design-system/Button/Button'
import { CriarMembroForm }  from '@/components/features/equipa/CriarMembroForm'
import { AlterarRoleModal } from '@/components/features/equipa/AlterarRoleModal'
import { listarEquipa, definirEstadoMembro, type MembroEquipa } from '@/services/equipa'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth }        from '@/providers/AuthProvider'
import type { AppRole }   from '@/types/domain/permission'

const ROLE_LABEL: Record<AppRole, string> = {
  superadmin:   'Admin Sistema',
  owner:        'Proprietário',
  manager:      'Gestor',
  receptionist: 'Recepcionista',
  staff:        'Colaborador',
}

const ROLE_BADGE: Record<AppRole, 'primary' | 'success' | 'default'> = {
  superadmin:   'primary',
  owner:        'primary',
  manager:      'success',
  receptionist: 'default',
  staff:        'default',
}

function formatarAcesso(iso: string | null): string {
  if (!iso) return 'Nunca acedeu'
  return 'Último acesso ' + new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function EquipaPage() {
  const qc = useQueryClient()
  const { can, isOwner } = usePermissions()
  const { profile }      = useAuth()
  const [roleMembro, setRoleMembro] = useState<MembroEquipa | null>(null)

  const { data: membros = [], isLoading, error } = useQuery({
    queryKey: ['equipa'],
    queryFn:  listarEquipa,
    enabled:  can('team.view'),
  })

  const toggleEstado = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => definirEstadoMembro(id, ativo),
    onSuccess:  () => void qc.invalidateQueries({ queryKey: ['equipa'] }),
  })

  // Protecção de página — após os hooks (Rules of Hooks)
  if (!can('team.view')) {
    return <AccessDenied description="Não tem permissão para ver a equipa. Contacte o proprietário da conta." />
  }

  return (
    <div>
      <PageHeader title="Equipa" description="Membros com acesso à sua conta" />

      {!isOwner && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
          <span className="text-xs font-medium text-amber-800">
            Acesso de leitura — apenas o proprietário pode adicionar ou desactivar membros.
          </span>
        </div>
      )}

      {isLoading ? (
        <LoadingState message="A carregar equipa..." />
      ) : error ? (
        <ErrorState title="Erro ao carregar a equipa." description={(error as Error).message} />
      ) : (
        <div className="space-y-3 mb-8">
          {membros.map((m) => {
            // Não se pode desactivar o proprietário nem o próprio utilizador
            const podeGerir = isOwner && m.role !== 'owner' && m.id !== profile?.id
            return (
              <div key={m.id} className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {m.full_name ?? '(sem nome)'}
                    {m.id === profile?.id && <span className="text-xs text-gray-400 font-normal"> · você</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatarAcesso(m.last_login_at)}
                    {m.recurso && <span className="text-gray-400"> · {m.recurso}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={ROLE_BADGE[m.role]}>{ROLE_LABEL[m.role]}</Badge>
                  <Badge variant={m.is_active ? 'success' : 'default'}>
                    {m.is_active ? 'Activo' : 'Suspenso'}
                  </Badge>
                  {podeGerir && (
                    <>
                      <Button
                        size="sm" variant="outline"
                        onClick={() => setRoleMembro(m)}
                        className="flex items-center gap-1"
                      >
                        <UserCog className="w-3.5 h-3.5" /> Função
                      </Button>
                      <Button
                        size="sm"
                        variant={m.is_active ? 'outline' : 'primary'}
                        onClick={() => toggleEstado.mutate({ id: m.id, ativo: !m.is_active })}
                        isLoading={toggleEstado.isPending}
                        className="flex items-center gap-1"
                      >
                        {m.is_active ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        {m.is_active ? 'Suspender' : 'Reactivar'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )
          })}

          {toggleEstado.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{(toggleEstado.error as Error).message}</p>
            </div>
          )}
        </div>
      )}

      {/* Adicionar membro — apenas owner (team.manage) */}
      {can('team.manage') && <CriarMembroForm />}

      {/* Alterar função de um membro — key remonta com estado fresco por membro */}
      <AlterarRoleModal
        key={roleMembro?.id ?? 'none'}
        isOpen={!!roleMembro}
        membro={roleMembro}
        onClose={() => setRoleMembro(null)}
      />
    </div>
  )
}
