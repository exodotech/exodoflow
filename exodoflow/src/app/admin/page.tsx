'use client'
// /admin — visão geral da administração do sistema (SOMENTE SUPERADMIN).
// O guard de acesso vive em admin/layout.tsx (role === 'superadmin', server-side).
import React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Building2, Users, Activity, CreditCard, ChevronRight, TrendingUp } from 'lucide-react'
import LoadingState from '@/components/design-system/LoadingState/LoadingState'
import { obterMetricasAdmin } from '@/services/admin'

export default function AdminPage() {
  const { data: m, isLoading } = useQuery({ queryKey: ['admin-metrics'], queryFn: obterMetricasAdmin })

  const atalhos = [
    { href: '/admin/empresas',     label: 'Empresas',  desc: 'Listar, criar, editar, suspender e definir plano', icon: Building2 },
    { href: '/admin/planos',       label: 'Planos',    desc: 'Criar e editar planos, preços e limites',          icon: CreditCard },
    { href: '/admin/utilizadores', label: 'Owners',    desc: 'Proprietários de cada empresa',                    icon: Users },
    { href: '/admin/sistema',      label: 'Sistema',   desc: 'Métricas globais e auditoria de sistema',          icon: Activity },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <div className="w-8 h-1 rounded-full mb-3 bg-gradient-to-r from-indigo-500 to-indigo-700" aria-hidden />
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Administração do Sistema</h1>
        <p className="text-sm text-slate-500 mt-1">Gestão de empresas, planos, owners e saúde da plataforma.</p>
      </div>

      {/* Resumo rápido */}
      {isLoading ? (
        <LoadingState message="A carregar resumo..." />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Resumo label="Empresas"   valor={m?.total_tenants ?? 0}    icon={<Building2 className="w-4 h-4" />} />
          <Resumo label="Activas"    valor={m?.active_tenants ?? 0}   cor="text-emerald-600" icon={<TrendingUp className="w-4 h-4" />} />
          <Resumo label="Suspensas"  valor={m?.suspended_tenants ?? 0} cor="text-red-600" />
          <Resumo label="Em trial"   valor={m?.trial_tenants ?? 0}    cor="text-amber-600" />
        </div>
      )}

      {/* Totais globais */}
      {!isLoading && (
        <div className="grid grid-cols-3 gap-3">
          <Mini label="Utilizadores" valor={m?.total_users ?? 0} />
          <Mini label="Clientes"     valor={m?.total_clients ?? 0} />
          <Mini label="Marcações"    valor={m?.total_bookings ?? 0} />
        </div>
      )}

      {/* Atalhos para as secções */}
      <div className="space-y-3">
        {atalhos.map((a) => {
          const Icon = a.icon
          return (
            <Link key={a.href} href={a.href}
              className="group flex items-center gap-3 bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 p-4 hover:border-indigo-200 hover:bg-white transition-all duration-150 hover:-translate-y-0.5 shadow-sm">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
                <Icon className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">{a.label}</p>
                <p className="text-xs text-slate-500">{a.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function Resumo({ label, valor, cor = 'text-slate-900', icon }: { label: string; valor: number; cor?: string; icon?: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        {icon && <span className="text-slate-300 inline-flex items-center [&>svg]:block">{icon}</span>}
      </div>
      <p className={`text-2xl font-bold ${cor}`}>{valor}</p>
    </div>
  )
}

function Mini({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="bg-white/50 backdrop-blur-sm rounded-xl border border-white/50 p-3 text-center">
      <p className="text-lg font-bold text-slate-800">{valor.toLocaleString('pt-PT')}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  )
}
