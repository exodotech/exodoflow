'use client'
// Secção "Histórico de tratamento" na ficha do cliente: registos por visita
// (observações + produtos usados). Registo operacional (não marketing).
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/design-system/Button/Button'
import { Input }  from '@/components/design-system/Input/Input'
import { useServicos } from '@/hooks/useServicos'
import { listarTratamentosCliente, criarTratamento, apagarTratamento } from '@/services/tratamentos'
import { criarTratamentoSchema, type CriarTratamentoInput } from '@/lib/validators/tratamento'
import { useFormWithZod } from '@/hooks/useFormWithZod'

export function FichaTratamento({ clientId }: { clientId: string }) {
  const qc = useQueryClient()
  const { data: servicos = [] } = useServicos()
  const [criar, setCriar] = useState(false)

  const key = ['cliente-tratamentos', clientId] as const
  const { data: registos = [], isLoading } = useQuery({ queryKey: key, queryFn: () => listarTratamentosCliente(clientId) })
  function invalidar() { void qc.invalidateQueries({ queryKey: key }) }

  const form = useFormWithZod(criarTratamentoSchema, {
    defaultValues: { client_id: clientId, service_id: '', performed_at: '', notes: '', products: '' },
  })
  const criarMut = useMutation({
    mutationFn: (d: CriarTratamentoInput) => criarTratamento(d),
    onSuccess: () => { invalidar(); form.reset({ client_id: clientId, service_id: '', performed_at: '', notes: '', products: '' }); setCriar(false) },
  })
  const apagar = useMutation({ mutationFn: (id: string) => apagarTratamento(id), onSuccess: invalidar })

  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
          <ClipboardList className="w-4 h-4 text-gray-400" /> Histórico de tratamento
        </p>
        <button onClick={() => setCriar((v) => !v)} className="text-xs font-medium text-[color:var(--tenant-primary)] hover:underline">
          {criar ? 'Fechar' : '+ Novo registo'}
        </button>
      </div>

      {criar && (
        <form onSubmit={form.handleSubmit((d) => criarMut.mutate(d))} className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-3 mb-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Serviço (opcional)</label>
              <select {...form.register('service_id')} className="w-full h-11 rounded-xl border border-slate-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--tenant-primary)]">
                <option value="">—</option>
                {servicos.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <Input label="Data" type="date" {...form.register('performed_at')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea rows={2} placeholder="O que foi feito, reação da pele, recomendações..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--tenant-primary)]"
              {...form.register('notes')} />
            {form.formState.errors.notes && <p className="mt-1 text-xs text-red-600">{form.formState.errors.notes.message}</p>}
          </div>
          <Input label="Produtos usados (opcional)" placeholder="Ex: ácido hialurónico, máscara X" {...form.register('products')} />
          {criarMut.isError && <p className="text-xs text-red-600">{(criarMut.error as Error).message}</p>}
          <Button type="submit" size="sm" isLoading={criarMut.isPending} disabled={criarMut.isPending} className="gap-1.5">
            <Plus className="w-4 h-4" /> Guardar registo
          </Button>
        </form>
      )}

      {isLoading ? (
        <p className="text-xs text-gray-400 italic">A carregar...</p>
      ) : registos.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Sem registos de tratamento.</p>
      ) : (
        <div className="space-y-2">
          {registos.map((r) => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-medium text-gray-700">
                  {fmt(r.performed_at)}{r.service?.name ? ` · ${r.service.name}` : ''}
                </span>
                <button onClick={() => apagar.mutate(r.id)} disabled={apagar.isPending} className="p-1 rounded text-red-400 hover:bg-red-50 disabled:opacity-50" title="Apagar registo">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {r.notes && <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.notes}</p>}
              {r.products && <p className="text-xs text-gray-500 mt-1"><span className="font-medium">Produtos:</span> {r.products}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
