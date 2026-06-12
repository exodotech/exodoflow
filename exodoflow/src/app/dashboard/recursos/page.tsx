'use client'
import React, { useState } from 'react'
import { Plus, User, DoorOpen, Wrench } from 'lucide-react'
import PageHeader       from '@/components/design-system/PageHeader/PageHeader'
import { Button }       from '@/components/design-system/Button/Button'
import SectionHeader    from '@/components/design-system/SectionHeader/SectionHeader'
import MobileCardList   from '@/components/design-system/MobileCardList/MobileCardList'
import DataTableWrapper from '@/components/design-system/DataTableWrapper/DataTableWrapper'
import Badge            from '@/components/design-system/Badge/Badge'
import LoadingState     from '@/components/design-system/LoadingState/LoadingState'
import EmptyState       from '@/components/design-system/EmptyState/EmptyState'
import ErrorState       from '@/components/design-system/ErrorState/ErrorState'
import AccessDenied     from '@/components/design-system/AccessDenied/AccessDenied'
import ConfirmDialog    from '@/components/design-system/ConfirmDialog/ConfirmDialog'
import { RecursoModal } from '@/components/features/recursos/RecursoModal'
import { useRecursos, useApagarRecurso } from '@/hooks/useRecursos'
import { usePermissions } from '@/hooks/usePermissions'
import type { ResourceType, Resource } from '@/types/domain'

// Rótulos PT para tipo de recurso
const TYPE_LABELS: Record<ResourceType, string> = {
  staff:     'Colaborador',
  room:      'Sala/Cabine',
  equipment: 'Equipamento',
}

const TYPE_ICONS: Record<ResourceType, React.ReactNode> = {
  staff:     <User className="w-4 h-4" />,
  room:      <DoorOpen className="w-4 h-4" />,
  equipment: <Wrench className="w-4 h-4" />,
}

export default function RecursosPage() {
  const [modalAberto, setModalAberto] = useState(false)
  const [recursoEditar, setRecursoEditar] = useState<Resource | null>(null)
  const [recursoApagar, setRecursoApagar] = useState<Resource | null>(null)
  const { data: recursos, isLoading, error, refetch } = useRecursos()
  const apagar = useApagarRecurso()
  const { can } = usePermissions()

  function abrirCriar()  { setRecursoEditar(null); setModalAberto(true) }
  function abrirEditar(r: Resource) { setRecursoEditar(r); setModalAberto(true) }
  async function confirmarApagar() {
    if (!recursoApagar) return
    try { await apagar.mutateAsync(recursoApagar.id); setRecursoApagar(null) }
    catch { /* erro mostrado no diálogo */ }
  }

  if (!can('resources.view')) {
    return <AccessDenied description="Não tem permissão para ver os recursos. Esta área é reservada a gestores e proprietários." />
  }

  if (isLoading) return <LoadingState message="A carregar recursos..." />
  if (error) return (
    <ErrorState
      title="Erro ao carregar recursos"
      description={error instanceof Error ? error.message : 'Erro desconhecido'}
      action={<Button size="sm" onClick={() => void refetch()}>Tentar novamente</Button>}
    />
  )

  const lista = recursos ?? []
  const porTipo = {
    staff:     lista.filter((r) => r.type === 'staff').length,
    room:      lista.filter((r) => r.type === 'room').length,
    equipment: lista.filter((r) => r.type === 'equipment').length,
  }

  // Cards mobile
  const resourceItems = lista.map((resource) => {
    const specialization = (resource.metadata as Record<string, string> | null)?.specialization ?? null
    const type = resource.type as ResourceType

    return {
      id:          resource.id,
      title:       resource.name,
      subtitle:    TYPE_LABELS[type] ?? resource.type,
      description: specialization ?? undefined,
      icon: (
        <span style={{ color: resource.color }}>
          {TYPE_ICONS[type] ?? <User className="w-4 h-4" />}
        </span>
      ),
      action: (
        <Badge variant={resource.is_active ? 'success' : 'default'}>
          {resource.is_active ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    }
  })

  // Tabela desktop
  const tableColumns = [
    { key: 'cor',             label: '',               width: '4%' },
    { key: 'nome',            label: 'Nome',           width: '28%' },
    { key: 'tipo',            label: 'Tipo',           width: '18%' },
    { key: 'especializacao',  label: 'Especialização', width: '30%' },
    { key: 'estado',          label: 'Estado',         width: '12%', align: 'center' as const },
    { key: 'acoes',           label: '',               width: '8%' },
  ]

  const tableRows = lista.map((resource) => {
    const specialization = (resource.metadata as Record<string, string> | null)?.specialization ?? '—'
    const type = resource.type as ResourceType

    return {
      cor: (
        <span
          className="inline-block w-3 h-3 rounded-full"
          style={{ backgroundColor: resource.color }}
        />
      ),
      nome:           resource.name,
      tipo:           TYPE_LABELS[type] ?? resource.type,
      especializacao: specialization,
      estado: (
        <Badge variant={resource.is_active ? 'success' : 'default'}>
          {resource.is_active ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
      acoes: can('resources.manage') ? (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => abrirEditar(resource)}
            className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
          >
            Editar
          </button>
          <button
            onClick={() => setRecursoApagar(resource)}
            className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
          >
            Apagar
          </button>
        </div>
      ) : null,
    }
  })

  return (
    <div>
      <PageHeader
        title="Recursos"
        description="Colaboradores, salas e equipamentos"
        action={
          can('resources.manage') ? (
            <Button size="md" className="gap-2" onClick={abrirCriar}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Recurso</span>
            </Button>
          ) : null
        }
      />

      {/* Stats por tipo */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <User className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{porTipo.staff}</p>
          <p className="text-xs text-gray-600 mt-1">Colaboradores</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <DoorOpen className="w-5 h-5 text-teal-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{porTipo.room}</p>
          <p className="text-xs text-gray-600 mt-1">Salas/Cabines</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <Wrench className="w-5 h-5 text-orange-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{porTipo.equipment}</p>
          <p className="text-xs text-gray-600 mt-1">Equipamentos</p>
        </div>
      </div>

      {/* Lista mobile */}
      <div className="sm:hidden bg-white rounded-lg border border-gray-200 p-4">
        <SectionHeader title="Lista de Recursos" />
        {lista.length > 0 ? (
          <MobileCardList items={resourceItems} />
        ) : (
          <EmptyState
            title="Nenhum recurso criado"
            description="Adicione colaboradores, salas ou equipamentos"
            action={
              can('resources.manage') ? (
                <Button size="sm" onClick={abrirCriar}>
                  <Plus className="w-4 h-4 mr-1" /> Novo Recurso
                </Button>
              ) : undefined
            }
          />
        )}
      </div>

      {/* Tabela desktop */}
      <div className="hidden sm:block">
        {lista.length > 0 ? (
          <DataTableWrapper columns={tableColumns} rows={tableRows} />
        ) : (
          <EmptyState
            title="Nenhum recurso criado"
            description="Adicione colaboradores, salas ou equipamentos"
            action={
              can('resources.manage') ? (
                <Button size="sm" onClick={abrirCriar}>
                  <Plus className="w-4 h-4 mr-1" /> Novo Recurso
                </Button>
              ) : undefined
            }
          />
        )}
      </div>

      <RecursoModal
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        recurso={recursoEditar}
      />

      <ConfirmDialog
        isOpen={!!recursoApagar}
        onClose={() => { setRecursoApagar(null); apagar.reset() }}
        onConfirm={confirmarApagar}
        title="Apagar recurso"
        description={recursoApagar ? `Tem a certeza que quer apagar "${recursoApagar.name}"? O recurso deixa de aparecer e de poder receber marcações.` : undefined}
        confirmLabel="Apagar"
        isLoading={apagar.isPending}
        error={apagar.isError ? (apagar.error as Error).message : null}
      />
    </div>
  )
}
