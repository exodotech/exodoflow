'use client'
// /admin/planos — gestão de planos de subscrição (SOMENTE SUPERADMIN).
// Criar/editar planos, preços e limites sem tocar em código. Os limites null
// significam "ilimitado". O guard de acesso vive em admin/layout.tsx.
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Plus, Pencil, Check } from 'lucide-react'
import { Badge }  from '@/components/design-system/Badge/Badge'
import { Button } from '@/components/design-system/Button/Button'
import { Input }  from '@/components/design-system/Input/Input'
import { Modal }  from '@/components/design-system/Modal/Modal'
import LoadingState from '@/components/design-system/LoadingState/LoadingState'
import ErrorState   from '@/components/design-system/ErrorState/ErrorState'
import EmptyState   from '@/components/design-system/EmptyState/EmptyState'
import { useFormWithZod } from '@/hooks/useFormWithZod'
import { listarPlanosAdmin, criarPlano, editarPlano, type PlanoAdmin } from '@/services/admin'
import { planoSchema, type PlanoInput } from '@/lib/validators/admin'

const PLANOS_KEY = ['admin-planos-full'] as const

function fmtPreco(v: number | null) {
  return v == null ? '—' : `${v.toFixed(2)} €`
}
function fmtLimite(v: number | null) {
  return v == null ? 'Ilimitado' : String(v)
}

export default function AdminPlanosPage() {
  const qc = useQueryClient()
  const [editando, setEditando] = useState<PlanoAdmin | null>(null)
  const [criando, setCriando]   = useState(false)

  const { data: planos = [], isLoading, error } = useQuery({ queryKey: PLANOS_KEY, queryFn: listarPlanosAdmin })

  if (isLoading) return <LoadingState message="A carregar planos..." />
  if (error)     return <ErrorState title="Erro ao carregar planos" description={(error as Error).message} />

  function fechar() {
    setEditando(null); setCriando(false)
    void qc.invalidateQueries({ queryKey: PLANOS_KEY })
    void qc.invalidateQueries({ queryKey: ['admin-plans'] })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="w-8 h-1 rounded-full mb-3 bg-gradient-to-r from-indigo-500 to-indigo-700" aria-hidden />
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Planos ({planos.length})</h1>
          <p className="text-sm text-slate-500 mt-1">Preços e limites de cada plano. Limite vazio = ilimitado.</p>
        </div>
        <Button onClick={() => setCriando(true)} className="gap-2 bg-gradient-to-br from-indigo-500 to-indigo-700">
          <Plus className="w-4 h-4" /> Novo plano
        </Button>
      </div>

      {planos.length === 0 ? (
        <EmptyState icon={<CreditCard className="w-12 h-12" />} title="Nenhum plano" description="Crie o primeiro plano." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {planos.map((p) => (
            <div key={p.id} className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="text-base font-bold text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{p.slug}</p>
                </div>
                <Badge variant={p.is_active ? 'success' : 'default'}>{p.is_active ? 'Activo' : 'Inactivo'}</Badge>
              </div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-2xl font-bold text-slate-900">{fmtPreco(p.price_monthly)}</span>
                <span className="text-xs text-slate-400">/mês</span>
              </div>
              <dl className="space-y-1.5 text-xs flex-1">
                <Linha termo="Anual" valor={fmtPreco(p.price_yearly)} />
                <Linha termo="Recursos" valor={fmtLimite(p.max_resources)} />
                <Linha termo="Clientes" valor={fmtLimite(p.max_clients)} />
                <Linha termo="Utilizadores" valor={fmtLimite(p.max_users)} />
              </dl>
              <Button size="sm" variant="outline" onClick={() => setEditando(p)} className="gap-1.5 mt-4 w-full">
                <Pencil className="w-3.5 h-3.5" /> Editar
              </Button>
            </div>
          ))}
        </div>
      )}

      {(criando || editando) && (
        <PlanoModal
          plano={editando}
          onClose={fechar}
        />
      )}
    </div>
  )
}

function Linha({ termo, valor }: { termo: string; valor: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-400">{termo}</dt>
      <dd className="text-slate-700 font-medium">{valor}</dd>
    </div>
  )
}

function PlanoModal({ plano, onClose }: { plano: PlanoAdmin | null; onClose: () => void }) {
  const editar = !!plano
  const form = useFormWithZod(planoSchema, {
    defaultValues: plano
      ? {
          name: plano.name, slug: plano.slug,
          price_monthly: plano.price_monthly ?? 0, price_yearly: plano.price_yearly ?? 0,
          max_resources: plano.max_resources, max_clients: plano.max_clients, max_users: plano.max_users,
          is_active: plano.is_active, sort_order: plano.sort_order,
        }
      : { name: '', slug: '', price_monthly: 0, price_yearly: 0, max_resources: null, max_clients: null, max_users: null, is_active: true, sort_order: 0 },
  })

  const mut = useMutation({
    mutationFn: (d: PlanoInput) => (editar ? editarPlano(plano!.id, d) : criarPlano(d)),
    onSuccess:  onClose,
  })

  return (
    <Modal isOpen onClose={onClose} title={editar ? 'Editar plano' : 'Novo plano'} size="md">
      <form onSubmit={form.handleSubmit((d) => mut.mutate(d))} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nome" error={form.formState.errors.name?.message} {...form.register('name')} />
          <Input label="Slug" error={form.formState.errors.slug?.message} {...form.register('slug')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Preço mensal (€)" type="number" step="0.01" error={form.formState.errors.price_monthly?.message} {...form.register('price_monthly')} />
          <Input label="Preço anual (€)" type="number" step="0.01" error={form.formState.errors.price_yearly?.message} {...form.register('price_yearly')} />
        </div>
        <p className="text-xs text-slate-400 -mt-1">Limites: deixar vazio = ilimitado.</p>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Recursos" type="number" placeholder="∞" error={form.formState.errors.max_resources?.message} {...form.register('max_resources')} />
          <Input label="Clientes" type="number" placeholder="∞" error={form.formState.errors.max_clients?.message} {...form.register('max_clients')} />
          <Input label="Utilizadores" type="number" placeholder="∞" error={form.formState.errors.max_users?.message} {...form.register('max_users')} />
        </div>
        <div className="grid grid-cols-2 gap-4 items-center">
          <Input label="Ordem" type="number" error={form.formState.errors.sort_order?.message} {...form.register('sort_order')} />
          <label className="flex items-center gap-2 text-sm text-slate-700 mt-6">
            <input type="checkbox" className="w-4 h-4 rounded accent-indigo-600" {...form.register('is_active')} />
            Plano activo
          </label>
        </div>

        {mut.isError && <div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-sm text-red-700">{(mut.error as Error).message}</p></div>}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={mut.isPending} fullWidth>Cancelar</Button>
          <Button type="submit" isLoading={mut.isPending} disabled={mut.isPending} fullWidth className="gap-1.5 bg-gradient-to-br from-indigo-500 to-indigo-700">
            <Check className="w-4 h-4" /> {editar ? 'Guardar' : 'Criar plano'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
