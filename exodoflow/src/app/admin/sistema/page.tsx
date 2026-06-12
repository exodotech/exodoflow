'use client'
// /admin/sistema — métricas globais agregadas + trilho de auditoria de sistema.
// SOMENTE SUPERADMIN (guard no layout). Métricas são CONTAGENS (RPC SECURITY
// DEFINER) — nunca expõem nomes/telefones/e-mails/notas de clientes.
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, CheckCircle2, PauseCircle, Sparkles, Users, UserSquare2, CalendarDays, ShieldCheck } from 'lucide-react'
import LoadingState from '@/components/design-system/LoadingState/LoadingState'
import ErrorState   from '@/components/design-system/ErrorState/ErrorState'
import EmptyState   from '@/components/design-system/EmptyState/EmptyState'
import { obterMetricasAdmin, listarSystemAudit } from '@/services/admin'

const ACTION_LABEL: Record<string, string> = {
  'tenant.create':      'Empresa criada',
  'tenant.suspend':     'Empresa suspensa',
  'tenant.reactivate':  'Empresa reactivada',
  'tenant.plan_change': 'Plano alterado',
  'owner.create':       'Owner criado',
  'tenant.update':      'Empresa editada',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function AdminSistemaPage() {
  const { data: m, isLoading, error } = useQuery({ queryKey: ['admin-metrics'], queryFn: obterMetricasAdmin })
  const { data: logs = [] } = useQuery({ queryKey: ['admin-system-audit'], queryFn: () => listarSystemAudit(100) })

  if (isLoading) return <LoadingState message="A carregar métricas..." />
  if (error)     return <ErrorState title="Erro ao carregar métricas" description={(error as Error).message} />

  const cards = [
    { label: 'Empresas',   valor: m?.total_tenants ?? 0,     icon: Building2,    cor: 'text-gray-900' },
    { label: 'Activas',    valor: m?.active_tenants ?? 0,    icon: CheckCircle2, cor: 'text-green-700' },
    { label: 'Suspensas',  valor: m?.suspended_tenants ?? 0, icon: PauseCircle,  cor: 'text-red-700' },
    { label: 'Em trial',   valor: m?.trial_tenants ?? 0,     icon: Sparkles,     cor: 'text-amber-600' },
    { label: 'Utilizadores', valor: m?.total_users ?? 0,     icon: Users,        cor: 'text-gray-900' },
    { label: 'Clientes',   valor: m?.total_clients ?? 0,     icon: UserSquare2,  cor: 'text-gray-900' },
    { label: 'Marcações',  valor: m?.total_bookings ?? 0,    icon: CalendarDays, cor: 'text-gray-900' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Sistema</h1>
        <p className="text-sm text-gray-500">Métricas globais agregadas (apenas contagens, sem dados pessoais).</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <div key={c.label} className="bg-white rounded-lg border border-gray-200 p-4">
              <Icon className="w-4 h-4 text-gray-400 mb-2" />
              <p className={`text-2xl font-bold ${c.cor}`}>{c.valor}</p>
              <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
            </div>
          )
        })}
      </div>

      {/* Trilho de auditoria de sistema (acções do superadmin) */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-gray-400" /> Auditoria de sistema
        </h2>
        {logs.length === 0 ? (
          <EmptyState icon={<ShieldCheck className="w-12 h-12" />} title="Sem registos" description="As acções administrativas aparecerão aqui." />
        ) : (
          <div className="space-y-2">
            {logs.map((l) => (
              <div key={l.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{ACTION_LABEL[l.action] ?? l.action}</p>
                  <p className="text-xs text-gray-500 truncate">{l.description ?? '—'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{l.actor_email ?? 'sistema'}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{fmt(l.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
