'use client'
// Secção de Pacotes de sessões na ficha do cliente. Vender pacotes (ex: 10
// massagens), ver sessões restantes e descontar a cada uso (atómico via RPC).
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, Plus, Check, Ban, Minus } from 'lucide-react'
import { Button } from '@/components/design-system/Button/Button'
import { Input }  from '@/components/design-system/Input/Input'
import { useServicos } from '@/hooks/useServicos'
import { useAuth } from '@/providers/AuthProvider'
import { listarPacotesCliente, criarPacote, consumirSessao, cancelarPacote } from '@/services/pacotes'
import { sessoesRestantes, percentagemUsada, estadoPacote, podeConsumir } from '@/lib/pacotes/pacotes'
import { criarPacoteSchema, type CriarPacoteInput } from '@/lib/validators/pacote'
import { useFormWithZod } from '@/hooks/useFormWithZod'
import { formatCurrencyByCode } from '@/lib/i18n/currency'
import type { TenantSettings, SupportedLocale } from '@/types/domain'

const ESTADO_LABEL: Record<string, { txt: string; cls: string }> = {
  ativo:     { txt: 'Ativo',     cls: 'bg-emerald-100 text-emerald-700' },
  esgotado:  { txt: 'Concluído', cls: 'bg-slate-100 text-slate-600' },
  expirado:  { txt: 'Expirado',  cls: 'bg-amber-100 text-amber-700' },
  cancelado: { txt: 'Cancelado', cls: 'bg-red-100 text-red-600' },
}

export function PacotesCliente({ clientId }: { clientId: string }) {
  const qc = useQueryClient()
  const { tenant } = useAuth()
  const { data: servicos = [] } = useServicos()
  const [criar, setCriar] = useState(false)

  const sett = tenant?.settings as TenantSettings | null | undefined
  const currency = sett?.currency ?? 'EUR'
  const locale: SupportedLocale = sett?.locale ?? 'pt-PT'
  const hojeISO = new Date().toISOString()

  const key = ['cliente-pacotes', clientId] as const
  const { data: pacotes = [], isLoading } = useQuery({ queryKey: key, queryFn: () => listarPacotesCliente(clientId) })
  function invalidar() { void qc.invalidateQueries({ queryKey: key }) }

  const consumir = useMutation({ mutationFn: (id: string) => consumirSessao(id), onSuccess: invalidar })
  const cancelar = useMutation({ mutationFn: (id: string) => cancelarPacote(id), onSuccess: invalidar })

  const form = useFormWithZod(criarPacoteSchema, {
    defaultValues: { client_id: clientId, name: '', total_sessions: 10, service_id: '', expires_at: '' },
  })
  const criarMut = useMutation({
    mutationFn: (d: CriarPacoteInput) => criarPacote(d),
    onSuccess: () => { invalidar(); form.reset({ client_id: clientId, name: '', total_sessions: 10, service_id: '', expires_at: '' }); setCriar(false) },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
          <Package className="w-4 h-4 text-gray-400" /> Pacotes de sessões
        </p>
        <button onClick={() => setCriar((v) => !v)} className="text-xs font-medium text-[color:var(--tenant-primary)] hover:underline">
          {criar ? 'Fechar' : '+ Novo pacote'}
        </button>
      </div>

      {/* Form novo pacote */}
      {criar && (
        <form onSubmit={form.handleSubmit((d) => criarMut.mutate(d))} className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-3 mb-3">
          <Input label="Nome do pacote" placeholder="Ex: 10 Limpezas de Pele" error={form.formState.errors.name?.message} {...form.register('name')} />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Nº de sessões" type="number" error={form.formState.errors.total_sessions?.message} {...form.register('total_sessions')} />
            <Input label="Preço (opcional)" type="number" step="0.01" error={form.formState.errors.price?.message} {...form.register('price')} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Serviço (opcional)</label>
              <select {...form.register('service_id')} className="w-full h-11 rounded-xl border border-slate-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--tenant-primary)]">
                <option value="">Qualquer serviço</option>
                {servicos.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <Input label="Validade (opcional)" type="date" {...form.register('expires_at')} />
          </div>
          {criarMut.isError && <p className="text-xs text-red-600">{(criarMut.error as Error).message}</p>}
          <Button type="submit" size="sm" isLoading={criarMut.isPending} disabled={criarMut.isPending} className="gap-1.5">
            <Plus className="w-4 h-4" /> Criar pacote
          </Button>
        </form>
      )}

      {/* Lista */}
      {isLoading ? (
        <p className="text-xs text-gray-400 italic">A carregar...</p>
      ) : pacotes.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Sem pacotes.</p>
      ) : (
        <div className="space-y-2">
          {pacotes.map((p) => {
            const estado = estadoPacote(p, hojeISO)
            const restantes = sessoesRestantes(p)
            const pct = percentagemUsada(p)
            const e = ESTADO_LABEL[estado]
            return (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">
                      {p.service?.name ?? 'Qualquer serviço'}
                      {p.price != null ? ` · ${formatCurrencyByCode(p.price, currency, locale)}` : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-md flex-shrink-0 ${e.cls}`}>{e.txt}</span>
                </div>
                {/* Progresso */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-[color:var(--tenant-primary)] transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-medium text-gray-700 tabular-nums">{p.used_sessions}/{p.total_sessions}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{restantes} sessão(ões) restante(s)</span>
                  <div className="flex items-center gap-1">
                    {podeConsumir(p, hojeISO) && (
                      <button
                        onClick={() => consumir.mutate(p.id)}
                        disabled={consumir.isPending}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--tenant-primary)] hover:bg-gray-100 px-2 py-1 rounded disabled:opacity-50"
                      >
                        <Minus className="w-3.5 h-3.5" /> Usar sessão
                      </button>
                    )}
                    {estado === 'esgotado' && <Check className="w-4 h-4 text-emerald-500" />}
                    {p.status === 'active' && (
                      <button
                        onClick={() => cancelar.mutate(p.id)}
                        disabled={cancelar.isPending}
                        className="p-1 rounded text-red-400 hover:bg-red-50 disabled:opacity-50"
                        title="Cancelar pacote"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {consumir.isError && <p className="text-xs text-red-600 mt-1">{(consumir.error as Error).message}</p>}
    </div>
  )
}
