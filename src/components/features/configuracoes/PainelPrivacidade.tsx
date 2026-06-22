'use client'
// Painel de Privacidade — registar e acompanhar pedidos de titulares (LGPD/RGPD).
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, Plus, Check, X } from 'lucide-react'
import SectionHeader from '@/components/design-system/SectionHeader/SectionHeader'
import { Button }    from '@/components/design-system/Button/Button'
import { Input }     from '@/components/design-system/Input/Input'
import Badge         from '@/components/design-system/Badge/Badge'
import AccessDenied  from '@/components/design-system/AccessDenied/AccessDenied'
import { usePermissions } from '@/hooks/usePermissions'
import { useFormWithZod } from '@/hooks/useFormWithZod'
import { listarPedidosDsr, criarPedidoDsr, atualizarStatusDsr, type DsrRow } from '@/services/dsr'
import { criarDsrSchema, DSR_TYPES, type CriarDsrInput, type DsrStatus } from '@/lib/validators/dsr'

const TYPE_LABEL: Record<string, string> = {
  acesso: 'Acesso', correcao: 'Correção', exclusao: 'Exclusão', anonimizacao: 'Anonimização',
  exportacao: 'Exportação', restricao: 'Restrição', oposicao: 'Oposição',
}
const STATUS_LABEL: Record<string, { txt: string; variant: 'warning' | 'primary' | 'success' | 'error' }> = {
  received: { txt: 'Recebido', variant: 'warning' }, in_progress: { txt: 'Em curso', variant: 'primary' },
  completed: { txt: 'Concluído', variant: 'success' }, rejected: { txt: 'Recusado', variant: 'error' },
}
const SELECT_CLS = 'w-full h-11 rounded-xl border border-slate-200 px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--tenant-primary)]'

export function PainelPrivacidade() {
  const { isManagerOrAbove } = usePermissions()
  const qc = useQueryClient()
  const [criar, setCriar] = useState(false)

  const { data: pedidos = [], isLoading } = useQuery({ queryKey: ['dsr'], queryFn: listarPedidosDsr, enabled: isManagerOrAbove })
  function invalidar() { void qc.invalidateQueries({ queryKey: ['dsr'] }) }
  const status = useMutation({ mutationFn: ({ id, s }: { id: string; s: DsrStatus }) => atualizarStatusDsr(id, s), onSuccess: invalidar })

  const form = useFormWithZod(criarDsrSchema, { defaultValues: { requester_name: '', requester_email: '', request_type: 'acesso', notes: '' } })
  const criarMut = useMutation({ mutationFn: (d: CriarDsrInput) => criarPedidoDsr(d), onSuccess: () => { invalidar(); form.reset(); setCriar(false) } })

  if (!isManagerOrAbove) {
    return <AccessDenied title="Área restrita" description="Apenas o proprietário e gestores gerem pedidos de titulares." />
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <SectionHeader title="Pedidos de titulares (LGPD/RGPD)" />
          <Button size="sm" onClick={() => setCriar((v) => !v)} className="gap-1.5">
            {criar ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {criar ? 'Fechar' : 'Registar pedido'}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Registe e acompanhe pedidos de acesso, correção, exclusão, etc. Confirme a identidade do requerente
          e tenha em conta as exceções legais (ex.: retenção fiscal/saúde) antes de executar.
        </p>

        {criar && (
          <form onSubmit={form.handleSubmit((d) => criarMut.mutate(d))} className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-3 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input label="Nome do requerente" error={form.formState.errors.requester_name?.message} {...form.register('requester_name')} />
              <Input label="Email (opcional)" type="email" error={form.formState.errors.requester_email?.message} {...form.register('requester_email')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de pedido</label>
              <select className={SELECT_CLS} {...form.register('request_type')}>
                {DSR_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
              </select>
            </div>
            <Input label="Notas (opcional)" placeholder="Detalhes, identidade confirmada, exceções..." {...form.register('notes')} />
            {criarMut.isError && <p className="text-xs text-red-600">{(criarMut.error as Error).message}</p>}
            <Button type="submit" size="sm" isLoading={criarMut.isPending} disabled={criarMut.isPending} className="gap-1.5">
              <Plus className="w-4 h-4" /> Registar
            </Button>
          </form>
        )}

        <div className="mt-4">
          {isLoading ? (
            <p className="text-sm text-gray-400 italic py-4 text-center">A carregar…</p>
          ) : pedidos.length === 0 ? (
            <div className="text-center py-8">
              <ShieldCheck className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-600">Sem pedidos registados.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {pedidos.map((p) => <LinhaPedido key={p.id} p={p} onStatus={(s) => status.mutate({ id: p.id, s })} busy={status.isPending} />)}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function LinhaPedido({ p, onStatus, busy }: { p: DsrRow; onStatus: (s: DsrStatus) => void; busy: boolean }) {
  const st = STATUS_LABEL[p.status] ?? STATUS_LABEL.received
  return (
    <li className="bg-white border border-gray-200 rounded-xl p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-gray-900 truncate">{p.requester_name}</p>
            <Badge variant="default">{TYPE_LABEL[p.request_type] ?? p.request_type}</Badge>
            <Badge variant={st.variant}>{st.txt}</Badge>
          </div>
          {p.requester_email && <p className="text-xs text-gray-500 mt-0.5">{p.requester_email}</p>}
          {p.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{p.notes}</p>}
          <p className="text-[11px] text-gray-400 mt-1">Recebido {new Date(p.received_at).toLocaleDateString('pt-PT')}</p>
        </div>
        {(p.status === 'received' || p.status === 'in_progress') && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {p.status === 'received' && (
              <button onClick={() => onStatus('in_progress')} disabled={busy} className="text-xs px-2 py-1 rounded text-[color:var(--tenant-primary)] hover:bg-gray-100 disabled:opacity-50">Em curso</button>
            )}
            <button onClick={() => onStatus('completed')} disabled={busy} title="Concluir" className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600 disabled:opacity-50"><Check className="w-4 h-4" /></button>
            <button onClick={() => onStatus('rejected')} disabled={busy} title="Recusar" className="p-1.5 rounded hover:bg-red-50 text-red-500 disabled:opacity-50"><X className="w-4 h-4" /></button>
          </div>
        )}
      </div>
    </li>
  )
}
