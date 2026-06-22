'use client'
// /dashboard/relatorios — histórico de relatórios financeiros (F3).
// Apenas OWNER + MANAGER (relatorios.view). Mobile-first.
import React, { useState } from 'react'
import { BarChart2, Send, FileText, Calendar, ChevronDown, ChevronRight } from 'lucide-react'
import PageHeader   from '@/components/design-system/PageHeader/PageHeader'
import { Button }   from '@/components/design-system/Button/Button'
import Badge        from '@/components/design-system/Badge/Badge'
import SectionHeader from '@/components/design-system/SectionHeader/SectionHeader'
import LoadingState  from '@/components/design-system/LoadingState/LoadingState'
import EmptyState    from '@/components/design-system/EmptyState/EmptyState'
import ErrorState    from '@/components/design-system/ErrorState/ErrorState'
import AccessDenied  from '@/components/design-system/AccessDenied/AccessDenied'
import { useRelatorios, useGerarRelatorio } from '@/hooks/useRelatorios'
import { usePermissions } from '@/hooks/usePermissions'
import type { RelatorioLog } from '@/types/domain/relatorios'

// Formata a data e hora para o fuso local
function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })
}

function TipoLabel({ tipo }: { tipo: string }) {
  if (tipo === 'relatorio_diario')  return <Badge variant="primary">Diário</Badge>
  if (tipo === 'relatorio_mensal') return <Badge variant="warning">Mensal</Badge>
  return <Badge>{tipo}</Badge>
}

function StatusLabel({ status }: { status: string }) {
  if (status === 'simulated') return <Badge variant="default">Simulado</Badge>
  if (status === 'sent')      return <Badge variant="success">Enviado</Badge>
  if (status === 'failed')    return <Badge variant="error">Falhou</Badge>
  return <Badge>{status}</Badge>
}

function RelatorioCard({ log }: { log: RelatorioLog }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setAberto(!aberto)}
        className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <TipoLabel tipo={log.event_type} />
              <StatusLabel status={log.status} />
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>{formatarDataHora(log.created_at)}</span>
              <span className="mx-1">·</span>
              <span className="truncate max-w-[160px]">{log.recipient}</span>
            </div>
          </div>
        </div>
        {aberto
          ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>
      {aberto && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <pre className="mt-3 text-xs font-mono text-gray-700 whitespace-pre-wrap bg-gray-50 rounded p-3 overflow-x-auto">
            {log.body}
          </pre>
        </div>
      )}
    </div>
  )
}

export default function RelatoriosPage() {
  const { can }  = usePermissions()
  const { data: logs = [], isLoading, error, refetch } = useRelatorios(50)
  const gerarDiario  = useGerarRelatorio()
  const gerarMensal  = useGerarRelatorio()

  if (!can('relatorios.view')) {
    return <AccessDenied description="Os relatórios são reservados ao proprietário e ao gestor." />
  }

  const podeManilar = can('financas.manage')

  return (
    <div>
      <PageHeader
        title="Relatórios"
        description="Histórico de resumos financeiros gerados. Envio simulado — sem provider de e-mail real."
        action={
          podeManilar ? (
            <div className="flex gap-2">
              <Button
                size="md"
                variant="outline"
                className="gap-1"
                disabled={gerarDiario.isPending}
                onClick={() => gerarDiario.mutate({ tipo: 'relatorio_diario' })}
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Hoje</span>
              </Button>
              <Button
                size="md"
                variant="outline"
                className="gap-1"
                disabled={gerarMensal.isPending}
                onClick={() => gerarMensal.mutate({ tipo: 'relatorio_mensal' })}
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Este mês</span>
              </Button>
            </div>
          ) : null
        }
      />

      {/* Feedback de trigger manual */}
      {(gerarDiario.isSuccess || gerarMensal.isSuccess) && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
          Relatório gerado e logado com sucesso. Actualiza a lista.
        </div>
      )}
      {(gerarDiario.isError || gerarMensal.isError) && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          {((gerarDiario.error ?? gerarMensal.error) as Error | null)?.message}
        </div>
      )}

      <SectionHeader title="Histórico" />

      {error ? (
        <ErrorState
          title="Erro ao carregar relatórios"
          description={(error as Error).message}
          action={<Button size="sm" onClick={() => void refetch()}>Tentar novamente</Button>}
        />
      ) : isLoading ? (
        <LoadingState message="A carregar histórico de relatórios..." />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<BarChart2 className="w-12 h-12" />}
          title="Sem relatórios ainda"
          description="Gere o primeiro relatório com os botões acima ou configure o envio automático em Configurações → Relatórios."
        />
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <RelatorioCard key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  )
}
