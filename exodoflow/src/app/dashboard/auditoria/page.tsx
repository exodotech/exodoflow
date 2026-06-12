'use client'
// Painel de Auditoria — trilho de acções críticas (audit_logs, append-only).
// Acesso: OWNER e MANAGER (leitura). STAFF/RECEPTIONIST → AccessDenied (RLS já
// bloqueia o SELECT, isto é a barreira de UI correspondente).
import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShieldCheck, Search } from 'lucide-react'
import PageHeader    from '@/components/design-system/PageHeader/PageHeader'
import AccessDenied  from '@/components/design-system/AccessDenied/AccessDenied'
import LoadingState  from '@/components/design-system/LoadingState/LoadingState'
import ErrorState    from '@/components/design-system/ErrorState/ErrorState'
import EmptyState    from '@/components/design-system/EmptyState/EmptyState'
import { Badge }     from '@/components/design-system/Badge/Badge'
import MobileCardList   from '@/components/design-system/MobileCardList/MobileCardList'
import DataTableWrapper from '@/components/design-system/DataTableWrapper/DataTableWrapper'
import { listarAuditoria } from '@/services/audit'
import { listarEquipa }    from '@/services/equipa'
import { usePermissions }  from '@/hooks/usePermissions'

// Acção técnica → descrição legível
const ACTION_LABEL: Record<string, string> = {
  'client.create':     'Cliente criado',
  'client.update':     'Cliente editado',
  'client.delete':     'Cliente apagado',
  'client.convert':    'Visitante convertido',
  'guest.create':      'Visitante criado',
  'booking.create':    'Marcação criada',
  'booking.cancel':    'Marcação cancelada',
  'booking.reschedule':'Marcação reagendada',
  'team.role_change':  'Função alterada',
  'team.suspend':      'Membro suspenso',
  'team.reactivate':   'Membro reactivado',
  'team.create':       'Membro criado',
  'company.update':    'Empresa editada',
  'branding.update':   'Branding alterado',
}

const ENTITY_LABEL: Record<string, string> = {
  clients: 'Cliente', bookings: 'Marcação', profiles: 'Membro', tenants: 'Empresa',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

export default function AuditoriaPage() {
  const { can } = usePermissions()
  const podeVer = can('audit.view')
  const [filtro, setFiltro] = useState<string>('todos')

  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ['auditoria'],
    queryFn:  () => listarAuditoria({ limit: 200 }),
    enabled:  podeVer,
  })
  const { data: membros = [] } = useQuery({
    queryKey: ['equipa'],
    queryFn:  listarEquipa,
    enabled:  podeVer,
  })

  // Barreira de UI (a RLS já bloqueia o SELECT no servidor)
  if (!podeVer) {
    return <AccessDenied description="A auditoria é reservada ao proprietário e gestores." />
  }

  const nomePorId = new Map(membros.map((m) => [m.id, m.full_name ?? '—']))
  const accoes = Array.from(new Set(logs.map((l) => l.action))).sort()
  const filtrados = filtro === 'todos' ? logs : logs.filter((l) => l.action === filtro)

  const cardItems = filtrados.map((l) => ({
    id:          l.id,
    title:       ACTION_LABEL[l.action] ?? l.action,
    subtitle:    nomePorId.get(l.actor_id ?? '') ?? 'Sistema',
    description: fmt(l.created_at),
    icon:        <ShieldCheck className="w-4 h-4 text-gray-400" />,
    action:      l.table_name ? <Badge variant="default">{ENTITY_LABEL[l.table_name] ?? l.table_name}</Badge> : undefined,
  }))

  const columns = [
    { key: 'data',     label: 'Data',      width: '20%' },
    { key: 'utilizador', label: 'Utilizador', width: '22%' },
    { key: 'accao',    label: 'Acção',     width: '28%' },
    { key: 'entidade', label: 'Entidade',  width: '15%', align: 'center' as const },
    { key: 'origem',   label: 'Origem',    width: '15%' },
  ]
  const rows = filtrados.map((l) => ({
    data:       fmt(l.created_at),
    utilizador: nomePorId.get(l.actor_id ?? '') ?? 'Sistema',
    accao:      ACTION_LABEL[l.action] ?? l.action,
    entidade:   l.table_name ? <Badge variant="default">{ENTITY_LABEL[l.table_name] ?? l.table_name}</Badge> : '—',
    origem:     (l.metadata && typeof l.metadata === 'object' && 'origem' in l.metadata) ? String(l.metadata.origem) : 'app',
  }))

  return (
    <div>
      <PageHeader title="Auditoria" description="Trilho de acções críticas da sua conta (append-only)" />

      {/* Filtro por acção */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-none">
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <button
          onClick={() => setFiltro('todos')}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${filtro === 'todos' ? 'bg-[color:var(--tenant-primary)] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Todos
        </button>
        {accoes.map((a) => (
          <button
            key={a}
            onClick={() => setFiltro(a)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${filtro === a ? 'bg-[color:var(--tenant-primary)] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {ACTION_LABEL[a] ?? a}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingState message="A carregar auditoria..." />
      ) : error ? (
        <ErrorState title="Erro ao carregar auditoria" description={(error as Error).message} />
      ) : filtrados.length === 0 ? (
        <EmptyState icon={<ShieldCheck className="w-12 h-12" />} title="Sem registos" description="As acções críticas aparecerão aqui." />
      ) : (
        <>
          <div className="sm:hidden bg-white rounded-lg border border-gray-200 p-4">
            <MobileCardList items={cardItems} />
          </div>
          <div className="hidden sm:block">
            <DataTableWrapper columns={columns} rows={rows} />
          </div>
        </>
      )}

      <p className="mt-4 text-xs text-gray-400">
        Mostrando os {filtrados.length} registos mais recentes. O trilho é imutável (append-only).
      </p>
    </div>
  )
}
