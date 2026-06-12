'use client'
// Painel de Sistema — saúde da aplicação para o OWNER (e SUPERADMIN no /admin).
// Mostra o resultado de /api/health, versão, ambiente e estado do Sentry.
// STAFF/RECEPTIONIST/MANAGER não acedem (gate isOwner).
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import PageHeader   from '@/components/design-system/PageHeader/PageHeader'
import AccessDenied from '@/components/design-system/AccessDenied/AccessDenied'
import LoadingState from '@/components/design-system/LoadingState/LoadingState'
import { Button }   from '@/components/design-system/Button/Button'
import { usePermissions }    from '@/hooks/usePermissions'
import { isSentryConfigured } from '@/lib/observability'

interface HealthResponse {
  status:   'ok' | 'degraded' | 'down'
  version:  string
  timestamp: string
  checks:   Record<string, 'ok' | 'fail' | 'skip'>
}

async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch('/api/health', { cache: 'no-store' })
  return res.json()
}

const STATUS_UI: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  ok:       { label: 'Operacional', cls: 'text-green-700 bg-green-50 border-green-200', icon: <CheckCircle2 className="w-5 h-5 text-green-600" /> },
  degraded: { label: 'Degradado',   cls: 'text-amber-700 bg-amber-50 border-amber-200', icon: <AlertTriangle className="w-5 h-5 text-amber-600" /> },
  down:     { label: 'Indisponível', cls: 'text-red-700 bg-red-50 border-red-200',      icon: <XCircle className="w-5 h-5 text-red-600" /> },
}

export default function SistemaPage() {
  const { can } = usePermissions()
  const podeVer = can('system.view')

  const { data: health, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['health'],
    queryFn:  fetchHealth,
    enabled:  podeVer,
    refetchInterval: 60_000,
  })

  if (!podeVer) {
    return <AccessDenied description="O estado do sistema é reservado ao proprietário da conta." />
  }

  const status = health?.status ?? 'down'
  const ui = STATUS_UI[status] ?? STATUS_UI.down
  const sentryOn = isSentryConfigured()
  const ambiente = process.env.NODE_ENV ?? 'development'

  return (
    <div>
      <PageHeader
        title="Sistema"
        description="Saúde da aplicação e serviços"
        action={
          <Button size="sm" variant="outline" onClick={() => void refetch()} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} /> Verificar
          </Button>
        }
      />

      {isLoading ? (
        <LoadingState message="A verificar o sistema..." />
      ) : (
        <div className="space-y-6 max-w-2xl">
          {/* Estado agregado */}
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${ui.cls}`}>
            {ui.icon}
            <div>
              <p className="text-sm font-semibold">{ui.label}</p>
              <p className="text-xs opacity-80">
                Última verificação: {health ? new Date(health.timestamp).toLocaleString('pt-PT') : '—'}
              </p>
            </div>
          </div>

          {/* Checks individuais */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-900 mb-3">Serviços</p>
            <div className="space-y-2">
              {Object.entries(health?.checks ?? {}).map(([nome, estado]) => (
                <div key={nome} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-gray-700">{nome}</span>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                    estado === 'ok' ? 'text-green-700' : estado === 'fail' ? 'text-red-700' : 'text-gray-400'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${estado === 'ok' ? 'bg-green-500' : estado === 'fail' ? 'bg-red-500' : 'bg-gray-300'}`} />
                    {estado === 'ok' ? 'OK' : estado === 'fail' ? 'Falha' : 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Metadados + Sentry */}
          <div className="grid grid-cols-2 gap-4">
            <Info label="Versão" valor={health?.version ?? '—'} />
            <Info label="Ambiente" valor={ambiente} />
            <div className="col-span-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Monitorização de erros</p>
              {sentryOn ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-green-700">
                  <CheckCircle2 className="w-4 h-4" /> Sentry configurado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm text-amber-700">
                  <AlertTriangle className="w-4 h-4" /> Sentry ainda não configurado
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Activity className="w-3.5 h-3.5" /> Re-verifica automaticamente a cada 60s.
          </div>
        </div>
      )}
    </div>
  )
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-gray-900 capitalize">{valor}</p>
    </div>
  )
}
