'use client'
import React, { useState } from 'react'
import { Plus, Mail, Search, Users, Zap } from 'lucide-react'
import PageHeader       from '@/components/design-system/PageHeader/PageHeader'
import { Button }       from '@/components/design-system/Button/Button'
import SectionHeader    from '@/components/design-system/SectionHeader/SectionHeader'
import MobileCardList   from '@/components/design-system/MobileCardList/MobileCardList'
import DataTableWrapper from '@/components/design-system/DataTableWrapper/DataTableWrapper'
import Badge            from '@/components/design-system/Badge/Badge'
import LoadingState     from '@/components/design-system/LoadingState/LoadingState'
import EmptyState       from '@/components/design-system/EmptyState/EmptyState'
import ErrorState       from '@/components/design-system/ErrorState/ErrorState'
import ConfirmDialog    from '@/components/design-system/ConfirmDialog/ConfirmDialog'
import { NovoClienteModal, type ClienteEditavel } from '@/components/features/clientes/NovoClienteModal'
import { ClienteDetalheModal } from '@/components/features/clientes/ClienteDetalheModal'
import { ClienteRapidoModal } from '@/components/features/clientes/ClienteRapidoModal'
import { useClientes, useApagarCliente } from '@/hooks/useClientes'
import { usePermissions } from '@/hooks/usePermissions'

type TipoFilter = 'todos' | 'clientes' | 'visitantes'
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export default function ClientesPage() {
  const [search,        setSearch]        = useState('')
  const [tipoFilter,    setTipoFilter]    = useState<TipoFilter>('todos')
  const [criarAberto,   setCriarAberto]   = useState(false)
  const [rapidoAberto,  setRapidoAberto]  = useState(false)
  const [detalheId,     setDetalheId]     = useState<string | null>(null)
  const [editar,        setEditar]        = useState<ClienteEditavel | null>(null)
  const [apagar,        setApagar]        = useState<ClienteEditavel | null>(null)

  const { data: clientes, isLoading, error, refetch } = useClientes()
  const apagarMut = useApagarCliente()
  const { can } = usePermissions()

  async function confirmarApagar() {
    if (!apagar) return
    try { await apagarMut.mutateAsync(apagar.id); setApagar(null) }
    catch { /* erro mostrado no diálogo */ }
  }

  // Estados de carregamento e erro
  if (isLoading) return <LoadingState message="A carregar clientes..." />
  if (error) return (
    <ErrorState
      title="Erro ao carregar clientes"
      description={error instanceof Error ? error.message : 'Erro desconhecido'}
      action={<Button size="sm" onClick={() => void refetch()}>Tentar novamente</Button>}
    />
  )

  const lista = clientes ?? []

  const filtered = lista.filter((client) => {
    const matchesSearch =
      search === '' ||
      client.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (client.phone ?? '').includes(search) ||
      (client.email ?? '').toLowerCase().includes(search.toLowerCase())

    // Filtro por tipo: cliente permanente vs visitante (só visualização)
    const matchesTipo =
      tipoFilter === 'todos' ||
      (tipoFilter === 'clientes'   && client.is_guest !== true) ||
      (tipoFilter === 'visitantes' && client.is_guest === true)

    return matchesSearch && matchesTipo
  })

  const totalVisitantes = lista.filter((c) => c.is_guest === true).length
  const recentes = lista.filter(
    (c) => new Date().getTime() - new Date(c.created_at).getTime() < THIRTY_DAYS_MS
  ).length

  // Cards mobile — tocar abre o detalhe do cliente
  const clientItems = filtered.map((client) => ({
    id:          client.id,
    title:       client.full_name,
    subtitle:    client.phone ?? undefined,
    description: client.email ?? undefined,
    icon:        <Mail className="w-4 h-4 text-gray-400" />,
    onClick:     () => setDetalheId(client.id),
    action: (
      <Badge variant={client.is_guest ? 'warning' : 'primary'}>
        {client.is_guest ? 'Visitante' : 'Cliente'}
      </Badge>
    ),
  }))

  // Colunas e linhas tabela desktop
  const tableColumns = [
    { key: 'nome',     label: 'Nome',       width: '30%' },
    { key: 'telefone', label: 'Telefone',   width: '20%' },
    { key: 'email',    label: 'E-mail',     width: '25%' },
    { key: 'tipo',     label: 'Tipo',       width: '12%', align: 'center' as const },
    { key: 'cadastro', label: 'Cadastrado', width: '13%' },
  ]

  const tableRows = filtered.map((client) => ({
    nome: (
      <button
        onClick={() => setDetalheId(client.id)}
        className="text-left font-medium text-gray-900 hover:text-[color:var(--tenant-primary)] hover:underline"
      >
        {client.full_name}
      </button>
    ),
    telefone: client.phone ?? '—',
    email:    client.email ?? '—',
    tipo: (
      <Badge variant={client.is_guest ? 'warning' : 'primary'}>
        {client.is_guest ? 'Visitante' : 'Cliente'}
      </Badge>
    ),
    cadastro: new Date(client.created_at).toLocaleDateString('pt-PT', {
      day: '2-digit', month: '2-digit', year: '2-digit',
    }),
  }))

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Gerencie os seus clientes"
        action={
          can('clients.create') ? (
            <div className="flex gap-2">
              <Button size="md" variant="outline" className="gap-2" onClick={() => setRapidoAberto(true)}>
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline">Cliente rápido</span>
              </Button>
              <Button size="md" className="gap-2" onClick={() => setCriarAberto(true)}>
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Novo Cliente</span>
              </Button>
            </div>
          ) : null
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{lista.length}</p>
          <p className="text-xs text-gray-600 mt-1">Total</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{totalVisitantes}</p>
          <p className="text-xs text-gray-600 mt-1">Visitantes</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{recentes}</p>
          <p className="text-xs text-gray-600 mt-1">Últimos 30 dias</p>
        </div>
      </div>

      {/* Barra de pesquisa + filtro */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Pesquisar por nome, telefone ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-10 pr-4 rounded-lg border border-gray-300 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[color:var(--tenant-primary)] focus:border-transparent"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {([
            { value: 'todos',      label: 'Todos' },
            { value: 'clientes',   label: 'Clientes' },
            { value: 'visitantes', label: 'Visitantes' },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTipoFilter(opt.value)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                tipoFilter === opt.value
                  ? 'bg-[color:var(--tenant-primary)] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista mobile */}
      <div className="sm:hidden bg-white rounded-lg border border-gray-200 p-4">
        <SectionHeader title={`${filtered.length} cliente(s)`} />
        {filtered.length > 0 ? (
          <MobileCardList items={clientItems} />
        ) : (
          <EmptyState
            icon={<Users className="w-12 h-12" />}
            title="Nenhum cliente encontrado"
            description={search ? 'Tente ajustar a sua pesquisa' : 'Crie o primeiro cliente'}
            action={
              can('clients.create') ? (
                <Button size="sm" onClick={() => setCriarAberto(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Novo Cliente
                </Button>
              ) : undefined
            }
          />
        )}
      </div>

      {/* Tabela desktop */}
      <div className="hidden sm:block">
        {filtered.length > 0 ? (
          <DataTableWrapper columns={tableColumns} rows={tableRows} />
        ) : (
          <EmptyState
            icon={<Users className="w-12 h-12" />}
            title="Nenhum cliente encontrado"
            description={search ? 'Tente ajustar a sua pesquisa' : 'Crie o primeiro cliente'}
            action={
              can('clients.create') ? (
                <Button size="sm" onClick={() => setCriarAberto(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Novo Cliente
                </Button>
              ) : undefined
            }
          />
        )}
      </div>

      {/* Criar / Editar cliente (mesmo modal, modo dual) */}
      <NovoClienteModal
        isOpen={criarAberto || !!editar}
        cliente={editar}
        onClose={() => { setCriarAberto(false); setEditar(null) }}
      />

      {/* Cliente rápido (visitante) — cadastro mínimo */}
      <ClienteRapidoModal
        isOpen={rapidoAberto}
        onClose={() => setRapidoAberto(false)}
      />

      {/* Detalhe do cliente — info, consentimentos, marcações */}
      <ClienteDetalheModal
        isOpen={!!detalheId}
        clientId={detalheId}
        onClose={() => setDetalheId(null)}
        onEditar={(c) => { setDetalheId(null); setEditar(c) }}
        onApagar={(c) => { setDetalheId(null); setApagar(c) }}
      />

      {/* Confirmação de soft-delete */}
      <ConfirmDialog
        isOpen={!!apagar}
        onClose={() => { setApagar(null); apagarMut.reset() }}
        onConfirm={confirmarApagar}
        title="Apagar cliente"
        description={apagar ? `Tem a certeza que quer apagar "${apagar.full_name}"? O cliente deixa de aparecer na lista; o histórico de marcações é preservado.` : undefined}
        confirmLabel="Apagar"
        isLoading={apagarMut.isPending}
        error={apagarMut.isError ? (apagarMut.error as Error).message : null}
      />
    </div>
  )
}
