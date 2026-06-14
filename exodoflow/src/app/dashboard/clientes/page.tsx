'use client'
import React, { useState, useMemo } from 'react'
import { Plus, Mail, Search, Users, Zap, Cake, Clock, Download, Tag } from 'lucide-react'
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
import { useBookings } from '@/hooks/useBookings'
import { usePermissions } from '@/hooks/usePermissions'
import {
  agregarStatsPorCliente, clienteInativo, fazAnosNoMes, gerarCSVClientes,
  todasAsTags, type ClienteBase,
} from '@/lib/clientes/insights'

type TipoFilter = 'todos' | 'clientes' | 'visitantes' | 'aniversariantes' | 'inativos'

export default function ClientesPage() {
  const [search,       setSearch]       = useState('')
  const [tipoFilter,   setTipoFilter]   = useState<TipoFilter>('todos')
  const [tagFiltro,    setTagFiltro]    = useState<string>('')
  const [criarAberto,  setCriarAberto]  = useState(false)
  const [rapidoAberto, setRapidoAberto] = useState(false)
  const [detalheId,    setDetalheId]    = useState<string | null>(null)
  const [editar,       setEditar]       = useState<ClienteEditavel | null>(null)
  const [apagar,       setApagar]       = useState<ClienteEditavel | null>(null)

  const { data: clientes, isLoading, error, refetch } = useClientes()
  const { data: bookings } = useBookings()
  const apagarMut = useApagarCliente()
  const { can } = usePermissions()

  const agoraISO = new Date().toISOString()
  const mesAtual = new Date().getMonth() + 1

  // Estatísticas por cliente (nº marcações + última visita) a partir das marcações
  const statsMap = useMemo(
    () => agregarStatsPorCliente(
      (bookings ?? []).map((b) => ({ client_id: b.client_id, start_at: b.start_at, status: b.status })),
      agoraISO,
    ),
    [bookings, agoraISO],
  )

  const lista = useMemo(() => (clientes ?? []) as unknown as ClienteBase[], [clientes])
  const tagsDisponiveis = useMemo(() => todasAsTags(lista), [lista])

  async function confirmarApagar() {
    if (!apagar) return
    try { await apagarMut.mutateAsync(apagar.id); setApagar(null) }
    catch { /* erro mostrado no diálogo */ }
  }

  if (isLoading) return <LoadingState message="A carregar clientes..." />
  if (error) return (
    <ErrorState
      title="Erro ao carregar clientes"
      description={error instanceof Error ? error.message : 'Erro desconhecido'}
      action={<Button size="sm" onClick={() => void refetch()}>Tentar novamente</Button>}
    />
  )

  // Contagens para os cartões de resumo
  const totalVisitantes  = lista.filter((c) => c.is_guest === true).length
  const aniversariantes  = lista.filter((c) => fazAnosNoMes(c.birth_date, mesAtual)).length
  const inativos         = lista.filter((c) => clienteInativo(statsMap.get(c.id), agoraISO, 3)).length

  // Aplicar pesquisa + filtros
  const filtered = lista.filter((c) => {
    const q = search.toLowerCase()
    const matchSearch = search === '' ||
      c.full_name.toLowerCase().includes(q) ||
      (c.phone ?? '').includes(search) ||
      (c.email ?? '').toLowerCase().includes(q)

    const matchTipo =
      tipoFilter === 'todos' ? true :
      tipoFilter === 'clientes'       ? c.is_guest !== true :
      tipoFilter === 'visitantes'     ? c.is_guest === true :
      tipoFilter === 'aniversariantes'? fazAnosNoMes(c.birth_date, mesAtual) :
      tipoFilter === 'inativos'       ? clienteInativo(statsMap.get(c.id), agoraISO, 3) : true

    const matchTag = tagFiltro === '' || (c.tags ?? []).includes(tagFiltro)

    return matchSearch && matchTipo && matchTag
  })

  function exportarCSV() {
    const csv  = gerarCSVClientes(filtered, statsMap)
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `clientes-${agoraISO.slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function fmtUltimaVisita(id: string): string {
    const u = statsMap.get(id)?.ultimaVisita
    if (!u) return 'Nunca'
    return new Date(u).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  const TagsChips = ({ tags }: { tags?: string[] | null }) => (
    (tags && tags.length > 0) ? (
      <span className="inline-flex flex-wrap gap-1">
        {tags.slice(0, 3).map((t) => (
          <span key={t} className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs">{t}</span>
        ))}
        {tags.length > 3 && <span className="text-xs text-slate-400">+{tags.length - 3}</span>}
      </span>
    ) : <span className="text-xs text-slate-300">—</span>
  )

  // Cartões mobile
  const clientItems = filtered.map((c) => ({
    id:          c.id,
    title:       c.full_name,
    subtitle:    c.phone ?? undefined,
    description: `${statsMap.get(c.id)?.total ?? 0} marcação(ões) · última: ${fmtUltimaVisita(c.id)}`,
    icon:        fazAnosNoMes(c.birth_date, mesAtual) ? <Cake className="w-4 h-4 text-pink-500" /> : <Mail className="w-4 h-4 text-gray-400" />,
    onClick:     () => setDetalheId(c.id),
    action: (
      <Badge variant={c.is_guest ? 'warning' : 'primary'}>{c.is_guest ? 'Visitante' : 'Cliente'}</Badge>
    ),
  }))

  // Tabela desktop
  const tableColumns = [
    { key: 'nome',     label: 'Nome',         width: '24%' },
    { key: 'contacto', label: 'Contacto',     width: '20%' },
    { key: 'tags',     label: 'Etiquetas',    width: '16%' },
    { key: 'visitas',  label: 'Marcações',    width: '10%', align: 'center' as const },
    { key: 'ultima',   label: 'Última visita',width: '14%' },
    { key: 'tipo',     label: 'Tipo',         width: '10%', align: 'center' as const },
  ]
  const tableRows = filtered.map((c) => ({
    nome: (
      <button onClick={() => setDetalheId(c.id)} className="flex items-center gap-1.5 text-left font-medium text-gray-900 hover:text-[color:var(--tenant-primary)] hover:underline">
        {fazAnosNoMes(c.birth_date, mesAtual) && <Cake className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />}
        {c.full_name}
      </button>
    ),
    contacto: <span className="text-sm text-gray-600">{c.phone ?? c.email ?? '—'}</span>,
    tags:    <TagsChips tags={c.tags} />,
    visitas: <span className="text-sm font-medium text-gray-700">{statsMap.get(c.id)?.total ?? 0}</span>,
    ultima:  <span className={`text-sm ${clienteInativo(statsMap.get(c.id), agoraISO, 3) ? 'text-amber-600 font-medium' : 'text-gray-600'}`}>{fmtUltimaVisita(c.id)}</span>,
    tipo:    <Badge variant={c.is_guest ? 'warning' : 'primary'}>{c.is_guest ? 'Visitante' : 'Cliente'}</Badge>,
  }))

  const FILTROS: { value: TipoFilter; label: string }[] = [
    { value: 'todos',           label: 'Todos' },
    { value: 'clientes',        label: 'Clientes' },
    { value: 'visitantes',      label: 'Visitantes' },
    { value: 'aniversariantes', label: '🎂 Aniversariantes' },
    { value: 'inativos',        label: 'Inativos' },
  ]

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="A sua base de clientes — pesquise, organize por etiquetas e veja quem precisa de atenção."
        action={
          can('clients.create') ? (
            <div className="flex gap-2">
              <Button size="md" variant="outline" className="gap-2" onClick={() => setRapidoAberto(true)} title="Cadastro rápido: só nome e telefone">
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline">Cliente rápido</span>
              </Button>
              <Button size="md" className="gap-2" onClick={() => setCriarAberto(true)}>
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Novo cliente</span>
              </Button>
            </div>
          ) : null
        }
      />

      {/* Resumo — cartões glass com explicação simples */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <ResumoCard label="Total de clientes" valor={lista.length} dica="Toda a sua base" icon={<Users className="w-4 h-4" />} />
        <ResumoCard label="Aniversariantes" valor={aniversariantes} dica="Fazem anos este mês" cor="text-pink-600" icon={<Cake className="w-4 h-4" />}
          onClick={() => setTipoFilter('aniversariantes')} />
        <ResumoCard label="Precisam de atenção" valor={inativos} dica="Sem vir há 3+ meses" cor="text-amber-600" icon={<Clock className="w-4 h-4" />}
          onClick={() => setTipoFilter('inativos')} />
        <ResumoCard label="Visitantes" valor={totalVisitantes} dica="Cadastro rápido" cor="text-slate-600" icon={<Zap className="w-4 h-4" />}
          onClick={() => setTipoFilter('visitantes')} />
      </div>

      {/* Pesquisa + exportar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Pesquisar por nome, telefone ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-10 pr-4 rounded-xl border border-white/60 bg-white/70 backdrop-blur-sm text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--tenant-primary)] focus:border-transparent"
          />
        </div>
        <Button variant="outline" size="md" className="gap-2" onClick={exportarCSV} disabled={!filtered.length} title="Descarrega um ficheiro que abre no Excel">
          <Download className="w-4 h-4" /> <span className="hidden sm:inline">Exportar (Excel)</span>
        </Button>
      </div>

      {/* Filtros por tipo + etiqueta */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {FILTROS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTipoFilter(opt.value)}
              className={`flex-shrink-0 px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
                tipoFilter === opt.value
                  ? 'bg-[color:var(--tenant-primary)] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {tagsDisponiveis.length > 0 && (
          <div className="relative ml-auto">
            <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <select
              value={tagFiltro}
              onChange={(e) => setTagFiltro(e.target.value)}
              className="h-9 pl-8 pr-3 rounded-full border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[color:var(--tenant-primary)]"
            >
              <option value="">Todas as etiquetas</option>
              {tagsDisponiveis.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Lista mobile */}
      <div className="sm:hidden bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm p-4">
        <SectionHeader title={`${filtered.length} cliente(s)`} />
        {filtered.length > 0 ? (
          <MobileCardList items={clientItems} />
        ) : (
          <EmptyClientes search={search} canCreate={can('clients.create')} onCreate={() => setCriarAberto(true)} />
        )}
      </div>

      {/* Tabela desktop */}
      <div className="hidden sm:block">
        {filtered.length > 0 ? (
          <DataTableWrapper columns={tableColumns} rows={tableRows} />
        ) : (
          <EmptyClientes search={search} canCreate={can('clients.create')} onCreate={() => setCriarAberto(true)} />
        )}
      </div>

      {/* Modais — montagem condicional com key: cada abertura é uma montagem
          nova, por isso o formulário e as etiquetas inicializam com os dados certos. */}
      {(criarAberto || !!editar) && (
        <NovoClienteModal
          key={editar?.id ?? 'novo'}
          isOpen
          cliente={editar}
          onClose={() => { setCriarAberto(false); setEditar(null) }}
        />
      )}
      <ClienteRapidoModal isOpen={rapidoAberto} onClose={() => setRapidoAberto(false)} />
      <ClienteDetalheModal
        isOpen={!!detalheId}
        clientId={detalheId}
        onClose={() => setDetalheId(null)}
        onEditar={(c) => { setDetalheId(null); setEditar(c) }}
        onApagar={(c) => { setDetalheId(null); setApagar(c) }}
      />
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

// Cartão de resumo glass, clicável para filtrar.
function ResumoCard({ label, valor, dica, cor = 'text-gray-900', icon, onClick }: {
  label: string; valor: number; dica: string; cor?: string; icon?: React.ReactNode; onClick?: () => void
}) {
  const Cmp = onClick ? 'button' : 'div'
  return (
    <Cmp
      onClick={onClick}
      className={`text-left bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm p-4 ${onClick ? 'hover:border-[color:var(--tenant-primary)] hover:-translate-y-0.5 transition-all cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <span className="text-gray-300">{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${cor}`}>{valor}</p>
      <p className="text-xs text-gray-400 mt-0.5">{dica}</p>
    </Cmp>
  )
}

function EmptyClientes({ search, canCreate, onCreate }: { search: string; canCreate: boolean; onCreate: () => void }) {
  return (
    <EmptyState
      icon={<Users className="w-12 h-12" />}
      title={search ? 'Nenhum cliente encontrado' : 'Ainda não tem clientes'}
      description={search ? 'Tente outra pesquisa ou limpe os filtros.' : 'Adicione o primeiro cliente para começar a organizar a sua agenda.'}
      action={canCreate ? <Button size="sm" onClick={onCreate}><Plus className="w-4 h-4 mr-1" /> Novo cliente</Button> : undefined}
    />
  )
}
