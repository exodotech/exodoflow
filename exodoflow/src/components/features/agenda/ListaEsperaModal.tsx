'use client'
// Lista de espera — adicionar clientes e geri-los para encaixar cancelamentos.
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Phone, Check, X, Trash2, Clock, UserPlus } from 'lucide-react'
import { Modal }  from '@/components/design-system/Modal/Modal'
import { Button } from '@/components/design-system/Button/Button'
import { Input }  from '@/components/design-system/Input/Input'
import Badge      from '@/components/design-system/Badge/Badge'
import { useClientes } from '@/hooks/useClientes'
import { useServicos } from '@/hooks/useServicos'
import { useRecursos } from '@/hooks/useRecursos'
import { useFormWithZod } from '@/hooks/useFormWithZod'
import { listarWaitlist, criarWaitlist, atualizarStatusWaitlist, removerWaitlist, type WaitlistEntry } from '@/services/waitlist'
import { criarWaitlistSchema, type CriarWaitlistInput } from '@/lib/validators/waitlist'

const SELECT_CLS = 'w-full h-11 rounded-xl border border-slate-200 px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--tenant-primary)]'

const STATUS_BADGE: Record<string, { txt: string; variant: 'warning' | 'primary' | 'success' | 'default' }> = {
  waiting:   { txt: 'A aguardar', variant: 'warning' },
  contacted: { txt: 'Contactado', variant: 'primary' },
  scheduled: { txt: 'Agendado',   variant: 'success' },
  cancelled: { txt: 'Cancelado',  variant: 'default' },
}

export function ListaEsperaModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)

  const { data: entradas = [], isLoading } = useQuery({
    queryKey: ['waitlist'],
    queryFn: () => listarWaitlist(false),
    enabled: isOpen,
  })

  function invalidar() { void qc.invalidateQueries({ queryKey: ['waitlist'] }) }
  const status = useMutation({ mutationFn: ({ id, s }: { id: string; s: 'contacted' | 'scheduled' | 'cancelled' }) => atualizarStatusWaitlist(id, s), onSuccess: invalidar })
  const remover = useMutation({ mutationFn: (id: string) => removerWaitlist(id), onSuccess: invalidar })

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Lista de espera" size="lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{entradas.length} pessoa(s) à espera de vaga.</p>
          <Button size="sm" onClick={() => setAddOpen((v) => !v)} className="gap-1.5">
            {addOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {addOpen ? 'Fechar' : 'Adicionar'}
          </Button>
        </div>

        {addOpen && <FormAdicionar onDone={() => { setAddOpen(false); invalidar() }} />}

        {isLoading ? (
          <p className="text-sm text-gray-400 italic py-6 text-center">A carregar…</p>
        ) : entradas.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-600">Ninguém na lista de espera.</p>
            <p className="text-xs text-gray-400 mt-1">Adicione clientes que querem encaixe quando surgir uma vaga.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {entradas.map((e) => (
              <LinhaEspera key={e.id} e={e}
                onContacted={() => status.mutate({ id: e.id, s: 'contacted' })}
                onScheduled={() => status.mutate({ id: e.id, s: 'scheduled' })}
                onRemove={() => remover.mutate(e.id)}
                busy={status.isPending || remover.isPending}
              />
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}

function LinhaEspera({ e, onContacted, onScheduled, onRemove, busy }: {
  e: WaitlistEntry; onContacted: () => void; onScheduled: () => void; onRemove: () => void; busy: boolean
}) {
  const nome = e.client?.full_name ?? e.contact_name ?? 'Sem nome'
  const tel = e.contact_phone
  const detalhes = [e.service?.name, e.resource?.name && `c/ ${e.resource.name}`, e.preferred_from && `a partir de ${e.preferred_from}`].filter(Boolean).join(' · ')
  const b = STATUS_BADGE[e.status] ?? STATUS_BADGE.waiting
  return (
    <li className="bg-white border border-gray-200 rounded-xl p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 truncate">{nome}</p>
            <Badge variant={b.variant}>{b.txt}</Badge>
          </div>
          {detalhes && <p className="text-xs text-gray-500 mt-0.5">{detalhes}</p>}
          {e.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{e.notes}</p>}
          {tel && (
            <a href={`tel:${tel}`} className="text-xs text-[color:var(--tenant-primary)] inline-flex items-center gap-1 mt-1 hover:underline">
              <Phone className="w-3 h-3" /> {tel}
            </a>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {e.status === 'waiting' && (
            <button onClick={onContacted} disabled={busy} title="Marcar como contactado" className="p-1.5 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-50">
              <Phone className="w-4 h-4" />
            </button>
          )}
          {e.status !== 'scheduled' && (
            <button onClick={onScheduled} disabled={busy} title="Marcar como agendado" className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600 disabled:opacity-50">
              <Check className="w-4 h-4" />
            </button>
          )}
          <button onClick={onRemove} disabled={busy} title="Remover" className="p-1.5 rounded hover:bg-red-50 text-red-500 disabled:opacity-50">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </li>
  )
}

function FormAdicionar({ onDone }: { onDone: () => void }) {
  const { data: clientes = [] } = useClientes()
  const { data: servicos = [] } = useServicos()
  const { data: recursos = [] } = useRecursos()
  const staff = recursos.filter((r) => r.type === 'staff')

  const form = useFormWithZod(criarWaitlistSchema, {
    defaultValues: { client_id: '', contact_name: '', contact_phone: '', service_id: '', resource_id: '', preferred_from: '', notes: '' },
  })
  const clienteId = form.watch('client_id')

  const criar = useMutation({
    mutationFn: (d: CriarWaitlistInput) => criarWaitlist(d),
    onSuccess: () => { form.reset(); onDone() },
  })

  return (
    <form onSubmit={form.handleSubmit((d) => criar.mutate(d))} className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
        <select className={SELECT_CLS} {...form.register('client_id')}>
          <option value="">— Sem cliente registado —</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
        </select>
      </div>

      {!clienteId && (
        <div className="grid grid-cols-2 gap-2">
          <Input label="Nome do contacto" placeholder="Ex: Maria (telefone)" error={form.formState.errors.contact_name?.message} {...form.register('contact_name')} />
          <Input label="Telefone" placeholder="+351 ..." {...form.register('contact_phone')} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Serviço (opcional)</label>
          <select className={SELECT_CLS} {...form.register('service_id')}>
            <option value="">Qualquer</option>
            {servicos.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Profissional (opcional)</label>
          <select className={SELECT_CLS} {...form.register('resource_id')}>
            <option value="">Qualquer</option>
            {staff.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      </div>

      <Input label="Disponível a partir de (opcional)" type="date" {...form.register('preferred_from')} />
      <Input label="Notas (opcional)" placeholder="Ex: prefere manhãs" {...form.register('notes')} />

      {criar.isError && <p className="text-xs text-red-600">{(criar.error as Error).message}</p>}
      <Button type="submit" size="sm" isLoading={criar.isPending} disabled={criar.isPending} className="gap-1.5">
        <UserPlus className="w-4 h-4" /> Adicionar à lista
      </Button>
    </form>
  )
}
