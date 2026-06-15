'use client'
// Configurações de Agenda — controla a "Marcação Rápida" (sem cliente
// identificado). Só o OWNER pode alterar; restantes vêem o estado em leitura.
import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Zap, Bell, Send } from 'lucide-react'
import SectionHeader from '@/components/design-system/SectionHeader/SectionHeader'
import AccessDenied  from '@/components/design-system/AccessDenied/AccessDenied'
import { Button }    from '@/components/design-system/Button/Button'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth }        from '@/providers/AuthProvider'
import { guardarPermitirMarcacaoRapida, guardarLembretesAtivos } from '@/services/agenda-config'
import { useProcessarLembretes } from '@/hooks/useLembretes'
import type { TenantSettings } from '@/types/domain/tenant'

export function PainelAgenda() {
  const { isOwner }   = usePermissions()
  const { tenant, refreshTenant } = useAuth()

  const settings = tenant?.settings as TenantSettings | null | undefined
  // Default true: só fica false se o owner desativar explicitamente
  const valorInicial = settings?.booking?.allow_quick_booking !== false
  const [permitir, setPermitir] = useState(valorInicial)
  const lembretesInicial = settings?.booking?.reminders_enabled === true
  const [lembretes, setLembretes] = useState(lembretesInicial)

  const guardar = useMutation({
    mutationFn: (v: boolean) => guardarPermitirMarcacaoRapida(v),
    onSuccess:  () => { void refreshTenant() },
  })
  const guardarLembr = useMutation({
    mutationFn: (v: boolean) => guardarLembretesAtivos(v),
    onSuccess:  () => { void refreshTenant() },
  })
  const processar = useProcessarLembretes()

  function toggle() {
    if (!isOwner || guardar.isPending) return
    const novo = !permitir
    setPermitir(novo)
    guardar.mutate(novo)
  }

  function toggleLembretes() {
    if (!isOwner || guardarLembr.isPending) return
    const novo = !lembretes
    setLembretes(novo)
    guardarLembr.mutate(novo)
  }

  if (!isOwner) {
    return (
      <div className="max-w-2xl space-y-6">
        <AccessDenied
          title="Apenas o Proprietário pode alterar a agenda"
          description={`As marcações rápidas estão ${valorInicial ? 'ativadas' : 'desativadas'}. Contacte o proprietário para alterar.`}
        />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm p-6">
        <SectionHeader title="Marcação Rápida" />
        <p className="text-sm text-gray-500 mt-1 mb-4">
          Permite criar marcações <strong>sem cliente identificado</strong> — ideal para
          atendimento de balcão, urgências ou clientes não cadastrados. Não recolhe nome,
          telefone nem dados pessoais.
        </p>

        <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50/60 border border-slate-100">
          <div className="flex items-start gap-3 min-w-0">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex-shrink-0">
              <Zap className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">Permitir marcações rápidas sem cliente identificado</p>
              <p className="text-xs text-slate-500">Quando desligado, a opção desaparece da Nova Marcação.</p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={permitir}
            onClick={toggle}
            disabled={guardar.isPending}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50 ${permitir ? 'bg-[color:var(--tenant-primary)]' : 'bg-slate-300'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ${permitir ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {guardar.isError && (
          <p className="text-sm text-red-600 mt-3">{(guardar.error as Error).message}</p>
        )}
        {guardar.isSuccess && (
          <p className="text-sm text-emerald-600 mt-3">Configuração guardada.</p>
        )}
      </div>

      {/* Lembretes automáticos */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm p-6">
        <SectionHeader title="Lembretes automáticos" />
        <p className="text-sm text-gray-500 mt-1 mb-4">
          Envia um lembrete ao cliente antes da marcação (reduz faltas). Atualmente
          <strong> simulado</strong> — fica registado nas conversas até o WhatsApp real estar ligado.
        </p>

        <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50/60 border border-slate-100 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex-shrink-0">
              <Bell className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">Ativar lembretes 24h antes</p>
              <p className="text-xs text-slate-500">Prepara o envio automático (quando o WhatsApp estiver ligado).</p>
            </div>
          </div>
          <button
            type="button" role="switch" aria-checked={lembretes}
            onClick={toggleLembretes} disabled={guardarLembr.isPending}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50 ${lembretes ? 'bg-[color:var(--tenant-primary)]' : 'bg-slate-300'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ${lembretes ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* Envio manual (simula o que um cron fará) */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => processar.mutate()} isLoading={processar.isPending} disabled={processar.isPending}>
            <Send className="w-4 h-4" /> Enviar lembretes agora
          </Button>
          {processar.isSuccess && (
            <span className="text-sm text-emerald-600">
              {processar.data.enviados} lembrete(s) {processar.data.mock ? 'simulado(s)' : 'enviado(s)'}
              {processar.data.ignorados > 0 ? ` · ${processar.data.ignorados} já tratada(s)` : ''}.
            </span>
          )}
          {processar.isError && <span className="text-sm text-red-600">{(processar.error as Error).message}</span>}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Processa as marcações das próximas 24h sem lembrete. Cada marcação recebe só um lembrete.
        </p>
      </div>
    </div>
  )
}
