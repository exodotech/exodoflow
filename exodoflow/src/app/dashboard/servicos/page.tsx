'use client'
import React, { useState, useMemo } from 'react'
import { Plus, Clock, Briefcase, TrendingUp } from 'lucide-react'
import PageHeader       from '@/components/design-system/PageHeader/PageHeader'
import { Button }       from '@/components/design-system/Button/Button'
import SectionHeader    from '@/components/design-system/SectionHeader/SectionHeader'
import MobileCardList   from '@/components/design-system/MobileCardList/MobileCardList'
import DataTableWrapper from '@/components/design-system/DataTableWrapper/DataTableWrapper'
import Badge            from '@/components/design-system/Badge/Badge'
import StatTile         from '@/components/design-system/StatTile/StatTile'
import LoadingState     from '@/components/design-system/LoadingState/LoadingState'
import EmptyState       from '@/components/design-system/EmptyState/EmptyState'
import ErrorState       from '@/components/design-system/ErrorState/ErrorState'
import AccessDenied     from '@/components/design-system/AccessDenied/AccessDenied'
import ConfirmDialog    from '@/components/design-system/ConfirmDialog/ConfirmDialog'
import { ServicoModal } from '@/components/features/servicos/ServicoModal'
import { useServicos, useApagarServico } from '@/hooks/useServicos'
import { useBookings } from '@/hooks/useBookings'
import { usePermissions } from '@/hooks/usePermissions'
import type { Service }   from '@/types/domain/service'

export default function ServicosPage() {
  const [modalAberto, setModalAberto] = useState(false)
  const [servicoEditar, setServicoEditar] = useState<Service | null>(null)
  const [servicoApagar, setServicoApagar] = useState<Service | null>(null)
  const { data: servicos, isLoading, error, refetch } = useServicos()
  const { data: bookings } = useBookings()
  const apagar = useApagarServico()
  const { can } = usePermissions()

  // Popularidade: nº de marcações (não-canceladas) por serviço
  const marcacoesPorServico = useMemo(() => {
    const m = new Map<string, number>()
    for (const b of bookings ?? []) {
      if (b.status === 'cancelled' || !b.service_id) continue
      m.set(b.service_id, (m.get(b.service_id) ?? 0) + 1)
    }
    return m
  }, [bookings])

  function abrirCriar()  { setServicoEditar(null); setModalAberto(true) }
  function abrirEditar(s: Service) { setServicoEditar(s); setModalAberto(true) }
  async function confirmarApagar() {
    if (!servicoApagar) return
    try { await apagar.mutateAsync(servicoApagar.id); setServicoApagar(null) }
    catch { /* erro mostrado no diálogo */ }
  }

  // Verificação de acesso à página (UI — o RLS bloqueia no servidor)
  if (!can('services.view')) {
    return <AccessDenied description="Não tem permissão para ver os serviços. Esta área é reservada a gestores e proprietários." />
  }

  if (isLoading) return <LoadingState message="A carregar serviços..." />
  if (error) return (
    <ErrorState
      title="Erro ao carregar serviços"
      description={error instanceof Error ? error.message : 'Erro desconhecido'}
      action={<Button size="sm" onClick={() => void refetch()}>Tentar novamente</Button>}
    />
  )

  const lista = servicos ?? []
  const receitaPotencial = lista.reduce((sum, s) => sum + (s.price ?? 0), 0)
  const ativos = lista.filter((s) => s.is_active).length

  // Serviço mais procurado (para o cartão de resumo)
  const maisProcurado = lista
    .map((s) => ({ nome: s.name, n: marcacoesPorServico.get(s.id) ?? 0 }))
    .sort((a, b) => b.n - a.n)[0]

  // Cards mobile
  const serviceItems = lista.map((service) => ({
    id:          service.id,
    title:       service.name,
    subtitle:    `${service.duration_minutes} min`,
    description: `€${(service.price ?? 0).toFixed(2)}`,
    icon:        <Clock className="w-4 h-4" style={{ color: service.color }} />,
    action: (
      <Badge variant={service.is_active ? 'success' : 'default'}>
        {service.is_active ? 'Activo' : 'Inactivo'}
      </Badge>
    ),
  }))

  // Tabela desktop
  const tableColumns = [
    { key: 'cor',     label: '',          width: '4%' },
    { key: 'nome',    label: 'Serviço',   width: '30%' },
    { key: 'duracao', label: 'Duração',   width: '15%' },
    { key: 'preco',   label: 'Preço',     width: '15%', align: 'right' as const },
    { key: 'procura', label: 'Marcações', width: '14%', align: 'center' as const },
    { key: 'estado',  label: 'Estado',    width: '14%', align: 'center' as const },
    { key: 'acoes',   label: '',          width: '8%' },
  ]

  const tableRows = lista.map((service) => ({
    cor: (
      <span
        className="inline-block w-3 h-3 rounded-full"
        style={{ backgroundColor: service.color }}
      />
    ),
    nome:    service.name,
    duracao: `${service.duration_minutes} min`,
    preco:   `€${(service.price ?? 0).toFixed(2)}`,
    procura: <span className="text-sm font-medium text-slate-700">{marcacoesPorServico.get(service.id) ?? 0}</span>,
    estado: (
      <Badge variant={service.is_active ? 'success' : 'default'}>
        {service.is_active ? 'Activo' : 'Inactivo'}
      </Badge>
    ),
    acoes: can('services.manage') ? (
      <div className="flex items-center justify-end gap-1">
        <button
          onClick={() => abrirEditar(service)}
          className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
        >
          Editar
        </button>
        <button
          onClick={() => setServicoApagar(service)}
          className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
        >
          Apagar
        </button>
      </div>
    ) : null,
  }))

  return (
    <div>
      <PageHeader
        title="Serviços"
        description="Gerencie os seus serviços e preços"
        action={
          can('services.manage') ? (
            <Button size="md" className="gap-2" onClick={abrirCriar}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Serviço</span>
            </Button>
          ) : null
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatTile label="Total" value={lista.length} hint="Serviços no catálogo" icon={<Briefcase className="w-4 h-4" />} />
        <StatTile label="Activos" value={ativos} hint="Disponíveis para marcar" valueClassName="text-emerald-600" />
        <StatTile label="Receita potencial" value={`€${receitaPotencial.toFixed(2)}`} hint="Soma dos preços" valueClassName="text-[color:var(--tenant-primary)]" />
        <StatTile
          label="Mais procurado"
          value={maisProcurado && maisProcurado.n > 0 ? maisProcurado.nome : '—'}
          hint={maisProcurado && maisProcurado.n > 0 ? `${maisProcurado.n} marcação(ões)` : 'Sem marcações ainda'}
          valueClassName="text-base truncate"
          icon={<TrendingUp className="w-4 h-4" />}
        />
      </div>

      {/* Lista mobile */}
      <div className="sm:hidden bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm p-4">
        <SectionHeader title="Lista de Serviços" />
        {lista.length > 0 ? (
          <MobileCardList items={serviceItems} />
        ) : (
          <EmptyState
            icon={<Briefcase className="w-12 h-12" />}
            title="Nenhum serviço criado"
            description="Adicione os serviços que a sua empresa oferece"
            action={
              <Button size="sm" onClick={abrirCriar}>
                <Plus className="w-4 h-4 mr-1" /> Novo Serviço
              </Button>
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
            icon={<Briefcase className="w-12 h-12" />}
            title="Nenhum serviço criado"
            description="Adicione os serviços que a sua empresa oferece"
            action={
              <Button size="sm" onClick={abrirCriar}>
                <Plus className="w-4 h-4 mr-1" /> Novo Serviço
              </Button>
            }
          />
        )}
      </div>

      <ServicoModal
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        servico={servicoEditar}
      />

      <ConfirmDialog
        isOpen={!!servicoApagar}
        onClose={() => { setServicoApagar(null); apagar.reset() }}
        onConfirm={confirmarApagar}
        title="Apagar serviço"
        description={servicoApagar ? `Tem a certeza que quer apagar "${servicoApagar.name}"? Esta acção pode ser revertida na base de dados, mas o serviço deixa de aparecer no catálogo.` : undefined}
        confirmLabel="Apagar"
        isLoading={apagar.isPending}
        error={apagar.isError ? (apagar.error as Error).message : null}
      />
    </div>
  )
}
