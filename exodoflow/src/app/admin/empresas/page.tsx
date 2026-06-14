'use client'
// /admin/empresas — gestão de empresas (SOMENTE SUPERADMIN; guard no layout).
// Lista empresas + owner + contagens. Cada cartão liga ao detalhe (/admin/empresas/[id])
// onde se edita tudo. Aqui ficam: criar empresa, pesquisa e acção rápida de estado.
// NUNCA mostra dados de clientes finais — só agregados e o owner.
import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, ShieldOff, ShieldCheck, Search, ChevronRight, Plus } from 'lucide-react'
import { Badge }  from '@/components/design-system/Badge/Badge'
import { Button } from '@/components/design-system/Button/Button'
import LoadingState  from '@/components/design-system/LoadingState/LoadingState'
import ErrorState    from '@/components/design-system/ErrorState/ErrorState'
import EmptyState    from '@/components/design-system/EmptyState/EmptyState'
import ConfirmDialog from '@/components/design-system/ConfirmDialog/ConfirmDialog'
import { CriarEmpresaForm } from '@/components/features/admin/CriarEmpresaForm'
import { listarEmpresasAdmin, definirEstadoTenant, type EmpresaAdmin } from '@/services/admin'

const EMPRESAS_KEY = ['admin-empresas'] as const

function fmtData(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}

export default function AdminEmpresasPage() {
  const qc = useQueryClient()
  const [busca, setBusca]           = useState('')
  const [criarAberto, setCriarAberto] = useState(false)
  const [aSuspender, setASuspender] = useState<EmpresaAdmin | null>(null)
  const [aReactivar, setAReactivar] = useState<EmpresaAdmin | null>(null)

  const { data: empresas = [], isLoading, error } = useQuery({
    queryKey: EMPRESAS_KEY,
    queryFn:  listarEmpresasAdmin,
  })

  const estado = useMutation({
    mutationFn: ({ e, ativo }: { e: EmpresaAdmin; ativo: boolean }) => definirEstadoTenant(e.id, ativo, e.name),
    onSuccess:  () => { void qc.invalidateQueries({ queryKey: EMPRESAS_KEY }); setASuspender(null); setAReactivar(null) },
  })

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return empresas
    return empresas.filter((e) =>
      e.name.toLowerCase().includes(q) ||
      e.slug.toLowerCase().includes(q) ||
      (e.owner_email ?? '').toLowerCase().includes(q)
    )
  }, [empresas, busca])

  if (isLoading) return <LoadingState message="A carregar empresas..." />
  if (error)     return <ErrorState title="Erro ao carregar empresas" description={(error as Error).message} />

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="w-8 h-1 rounded-full mb-3 bg-gradient-to-r from-indigo-500 to-indigo-700" aria-hidden />
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Empresas ({empresas.length})</h1>
          <p className="text-sm text-slate-500 mt-1">Toque numa empresa para gerir tudo. Sem dados de clientes finais.</p>
        </div>
        <Button onClick={() => setCriarAberto((v) => !v)} className="gap-2 bg-gradient-to-br from-indigo-500 to-indigo-700">
          <Plus className="w-4 h-4" /> Nova empresa
        </Button>
      </div>

      {/* Pesquisa */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar por nome, slug ou e-mail do owner..."
          className="w-full h-11 pl-10 pr-3 rounded-xl border border-white/60 bg-white/70 backdrop-blur-sm text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300"
        />
      </div>

      {/* Formulário de criação (colapsável) */}
      {criarAberto && (
        <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 p-5 shadow-sm animate-slide-down">
          <CriarEmpresaForm />
        </div>
      )}

      {filtradas.length === 0 ? (
        <EmptyState icon={<Building2 className="w-12 h-12" />} title="Nenhuma empresa encontrada"
          description={busca ? 'Tente outra pesquisa.' : 'Crie a primeira empresa acima.'} />
      ) : (
        <div className="space-y-3">
          {filtradas.map((e) => (
            <div key={e.id} className="group bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 p-4 shadow-sm hover:border-indigo-200 hover:bg-white transition-all duration-150">
              <div className="flex items-center gap-3">
                <Link href={`/admin/empresas/${e.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex-shrink-0 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                    <Building2 className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{e.name}</p>
                    <p className="text-xs text-slate-500 font-mono truncate">
                      {e.slug} · {e.country === 'BR' ? '🇧🇷 BR' : '🇵🇹 PT'} · {e.business_type}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={!e.is_active ? 'error' : e.plan_id ? 'success' : 'warning'}>
                    {!e.is_active ? 'Suspensa' : e.plan_id ? 'Activa' : 'Trial'}
                  </Badge>
                  {e.is_active ? (
                    <Button size="sm" variant="outline" onClick={() => setASuspender(e)} className="hidden sm:flex items-center gap-1 border-red-200 text-red-600 hover:bg-red-50">
                      <ShieldOff className="w-3.5 h-3.5" /> Suspender
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setAReactivar(e)} className="hidden sm:flex items-center gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                      <ShieldCheck className="w-3.5 h-3.5" /> Reactivar
                    </Button>
                  )}
                  <Link href={`/admin/empresas/${e.id}`} className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>

              {/* Owner + contagens agregadas (sem PII de clientes) */}
              <Link href={`/admin/empresas/${e.id}`} className="block mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-slate-400">Owner</p>
                  <p className="text-slate-700 truncate">{e.owner_name ?? <span className="text-amber-600">sem owner</span>}</p>
                </div>
                <div>
                  <p className="text-slate-400">Último acesso</p>
                  <p className="text-slate-700">{fmtData(e.owner_last_login)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Util. · Clientes</p>
                  <p className="text-slate-700">{e.user_count} · {e.client_count}</p>
                </div>
                <div>
                  <p className="text-slate-400">Marcações · Criada</p>
                  <p className="text-slate-700">{e.booking_count} · {fmtData(e.created_at)}</p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Confirmações de estado */}
      <ConfirmDialog
        isOpen={!!aSuspender}
        onClose={() => { setASuspender(null); estado.reset() }}
        onConfirm={() => aSuspender && estado.mutate({ e: aSuspender, ativo: false })}
        title="Suspender empresa"
        description={aSuspender ? `Suspender "${aSuspender.name}"? O acesso ao dashboard fica bloqueado até reactivar. Os dados são preservados.` : undefined}
        confirmLabel="Suspender"
        isLoading={estado.isPending}
        error={estado.isError ? (estado.error as Error).message : null}
      />
      <ConfirmDialog
        isOpen={!!aReactivar}
        onClose={() => { setAReactivar(null); estado.reset() }}
        onConfirm={() => aReactivar && estado.mutate({ e: aReactivar, ativo: true })}
        title="Reactivar empresa"
        description={aReactivar ? `Reactivar "${aReactivar.name}"? O acesso ao dashboard é restaurado.` : undefined}
        confirmLabel="Reactivar"
        isLoading={estado.isPending}
        error={estado.isError ? (estado.error as Error).message : null}
      />
    </div>
  )
}
