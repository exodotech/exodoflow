'use client'
// Configurações de Agenda — controla a "Marcação Rápida" (sem cliente
// identificado). Só o OWNER pode alterar; restantes vêem o estado em leitura.
import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Zap } from 'lucide-react'
import SectionHeader from '@/components/design-system/SectionHeader/SectionHeader'
import AccessDenied  from '@/components/design-system/AccessDenied/AccessDenied'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth }        from '@/providers/AuthProvider'
import { guardarPermitirMarcacaoRapida } from '@/services/agenda-config'
import type { TenantSettings } from '@/types/domain/tenant'

export function PainelAgenda() {
  const { isOwner }   = usePermissions()
  const { tenant, refreshTenant } = useAuth()

  const settings = tenant?.settings as TenantSettings | null | undefined
  // Default true: só fica false se o owner desativar explicitamente
  const valorInicial = settings?.booking?.allow_quick_booking !== false
  const [permitir, setPermitir] = useState(valorInicial)

  const guardar = useMutation({
    mutationFn: (v: boolean) => guardarPermitirMarcacaoRapida(v),
    onSuccess:  () => { void refreshTenant() },
  })

  function toggle() {
    if (!isOwner || guardar.isPending) return
    const novo = !permitir
    setPermitir(novo)
    guardar.mutate(novo)
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
    </div>
  )
}
