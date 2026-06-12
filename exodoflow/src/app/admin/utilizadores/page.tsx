'use client'
// /admin/utilizadores — owners das empresas (SOMENTE SUPERADMIN; guard no layout).
// Um owner por empresa (o principal). NUNCA mostra clientes finais.
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, Mail } from 'lucide-react'
import { Badge } from '@/components/design-system/Badge/Badge'
import LoadingState from '@/components/design-system/LoadingState/LoadingState'
import ErrorState   from '@/components/design-system/ErrorState/ErrorState'
import EmptyState   from '@/components/design-system/EmptyState/EmptyState'
import MobileCardList   from '@/components/design-system/MobileCardList/MobileCardList'
import DataTableWrapper from '@/components/design-system/DataTableWrapper/DataTableWrapper'
import { listarOwnersAdmin } from '@/services/admin'

function fmt(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}

export default function AdminUtilizadoresPage() {
  const { data: owners = [], isLoading, error } = useQuery({
    queryKey: ['admin-owners'],
    queryFn:  listarOwnersAdmin,
  })

  if (isLoading) return <LoadingState message="A carregar owners..." />
  if (error)     return <ErrorState title="Erro ao carregar owners" description={(error as Error).message} />

  const cardItems = owners.map((o) => ({
    id:          o.owner_id,
    title:       o.owner_name ?? '(sem nome)',
    subtitle:    o.owner_email ?? '—',
    description: `${o.tenant_name} · último acesso ${fmt(o.owner_last_login)}`,
    icon:        <Mail className="w-4 h-4 text-gray-400" />,
    action:      <Badge variant={o.owner_is_active ? 'success' : 'error'}>{o.owner_is_active ? 'Activo' : 'Suspenso'}</Badge>,
  }))

  const columns = [
    { key: 'nome',     label: 'Owner',       width: '24%' },
    { key: 'email',    label: 'E-mail',      width: '26%' },
    { key: 'empresa',  label: 'Empresa',     width: '20%' },
    { key: 'estado',   label: 'Estado',      width: '12%', align: 'center' as const },
    { key: 'acesso',   label: 'Último acesso', width: '18%' },
  ]
  const rows = owners.map((o) => ({
    nome:    o.owner_name ?? '(sem nome)',
    email:   o.owner_email ?? '—',
    empresa: o.tenant_name,
    estado:  <Badge variant={o.owner_is_active ? 'success' : 'error'}>{o.owner_is_active ? 'Activo' : 'Suspenso'}</Badge>,
    acesso:  fmt(o.owner_last_login),
  }))

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Owners ({owners.length})</h1>
      <p className="text-sm text-gray-500 mb-6">Proprietários de cada empresa. Sem acesso a clientes finais.</p>

      {owners.length === 0 ? (
        <EmptyState icon={<Users className="w-12 h-12" />} title="Nenhum owner" description="As empresas com proprietário aparecerão aqui." />
      ) : (
        <>
          <div className="sm:hidden bg-white rounded-lg border border-gray-200 p-4"><MobileCardList items={cardItems} /></div>
          <div className="hidden sm:block"><DataTableWrapper columns={columns} rows={rows} /></div>
        </>
      )}
    </div>
  )
}
