'use client'
// /admin — visão geral da administração do sistema (SOMENTE SUPERADMIN).
// O guard de acesso vive em admin/layout.tsx (role === 'superadmin', server-side).
// As empresas criam-se diretamente neste painel (/admin/empresas → "Criar nova
// empresa", via o Route Handler /api/admin/criar-empresa) — sem ferramentas externas.
import React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Building2, Users, Activity, ChevronRight } from 'lucide-react'
import LoadingState from '@/components/design-system/LoadingState/LoadingState'
import { obterMetricasAdmin } from '@/services/admin'

export default function AdminPage() {
  const { data: m, isLoading } = useQuery({ queryKey: ['admin-metrics'], queryFn: obterMetricasAdmin })

  const atalhos = [
    { href: '/admin/empresas',     label: 'Empresas',  desc: 'Listar, criar, suspender e definir plano', icon: Building2 },
    { href: '/admin/utilizadores', label: 'Owners',    desc: 'Proprietários de cada empresa',            icon: Users },
    { href: '/admin/sistema',      label: 'Sistema',   desc: 'Métricas globais e auditoria de sistema',  icon: Activity },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Administração do Sistema</h1>
        <p className="text-sm text-gray-500">Gestão de empresas, owners e saúde da plataforma.</p>
      </div>

      {/* Resumo rápido */}
      {isLoading ? (
        <LoadingState message="A carregar resumo..." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Resumo label="Empresas"   valor={m?.total_tenants ?? 0} />
          <Resumo label="Activas"    valor={m?.active_tenants ?? 0} cor="text-green-700" />
          <Resumo label="Suspensas"  valor={m?.suspended_tenants ?? 0} cor="text-red-700" />
          <Resumo label="Em trial"   valor={m?.trial_tenants ?? 0} cor="text-amber-600" />
        </div>
      )}

      {/* Atalhos para as secções */}
      <div className="space-y-3">
        {atalhos.map((a) => {
          const Icon = a.icon
          return (
            <Link key={a.href} href={a.href}
              className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0">
                <Icon className="w-5 h-5 text-gray-600" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{a.label}</p>
                <p className="text-xs text-gray-500">{a.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function Resumo({ label, valor, cor = 'text-gray-900' }: { label: string; valor: number; cor?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
      <p className={`text-2xl font-bold ${cor}`}>{valor}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}
