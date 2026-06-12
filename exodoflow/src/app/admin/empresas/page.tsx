'use client'
// /admin/empresas — gestão de empresas (SOMENTE SUPERADMIN; guard no layout).
// Lista empresas + owner principal (nome/e-mail) + contagens. Suspender/reactivar
// com confirmação, definir plano, criar nova empresa. NUNCA mostra dados de
// clientes finais (telefone/e-mail/notas) — só agregados e o owner.
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, ShieldCheck, ShieldOff, Globe } from 'lucide-react'
import { Badge }  from '@/components/design-system/Badge/Badge'
import { Button } from '@/components/design-system/Button/Button'
import LoadingState  from '@/components/design-system/LoadingState/LoadingState'
import ErrorState    from '@/components/design-system/ErrorState/ErrorState'
import EmptyState    from '@/components/design-system/EmptyState/EmptyState'
import ConfirmDialog from '@/components/design-system/ConfirmDialog/ConfirmDialog'
import { CriarEmpresaForm } from '@/components/features/admin/CriarEmpresaForm'
import { AlterarPaisModal } from '@/components/features/admin/AlterarPaisModal'
import {
  listarEmpresasAdmin, definirEstadoTenant, definirPlanoTenant, definirPaisTenant,
  type EmpresaAdmin,
} from '@/services/admin'
import type { MarketCountry } from '@/lib/i18n/market'
import { createClient } from '@/lib/supabase/client'

const EMPRESAS_KEY = ['admin-empresas'] as const

async function listarPlanos() {
  const supabase = createClient()
  const { data, error } = await supabase.from('plans').select('id, name').order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as { id: string; name: string }[]
}

function fmtData(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}

export default function AdminEmpresasPage() {
  const qc = useQueryClient()
  const [aSuspender, setASuspender]   = useState<EmpresaAdmin | null>(null)
  const [aReactivar, setAReactivar]   = useState<EmpresaAdmin | null>(null)
  const [aAlterarPais, setAAlterarPais] = useState<EmpresaAdmin | null>(null)

  const { data: empresas = [], isLoading, error } = useQuery({
    queryKey: EMPRESAS_KEY,
    queryFn:  listarEmpresasAdmin,
  })
  const { data: planos = [] } = useQuery({ queryKey: ['admin-plans'], queryFn: listarPlanos })

  const estado = useMutation({
    mutationFn: ({ e, ativo }: { e: EmpresaAdmin; ativo: boolean }) => definirEstadoTenant(e.id, ativo, e.name),
    onSuccess:  () => { void qc.invalidateQueries({ queryKey: EMPRESAS_KEY }); setASuspender(null); setAReactivar(null) },
  })
  const plano = useMutation({
    mutationFn: ({ e, planId }: { e: EmpresaAdmin; planId: string | null }) => definirPlanoTenant(e.id, planId, e.name),
    onSuccess:  () => void qc.invalidateQueries({ queryKey: EMPRESAS_KEY }),
  })
  const pais = useMutation({
    mutationFn: ({ e, country }: { e: EmpresaAdmin; country: MarketCountry }) => definirPaisTenant(e.id, country, e.name),
    onSuccess:  () => { void qc.invalidateQueries({ queryKey: EMPRESAS_KEY }); setAAlterarPais(null) },
  })

  if (isLoading) return <LoadingState message="A carregar empresas..." />
  if (error)     return <ErrorState title="Erro ao carregar empresas" description={(error as Error).message} />

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Empresas ({empresas.length})</h1>
        <p className="text-sm text-gray-500">Estado, plano, owner e progresso de onboarding. Sem dados de clientes finais.</p>
      </div>

      {empresas.length === 0 ? (
        <EmptyState icon={<Building2 className="w-12 h-12" />} title="Nenhuma empresa registada" description="Crie a primeira empresa abaixo." />
      ) : (
        <div className="space-y-3">
          {empresas.map((e) => (
            <div key={e.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Building2 className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{e.name}</p>
                    <p className="text-xs text-gray-500 font-mono truncate">
                      {e.slug} · {e.country === 'BR' ? '🇧🇷 BR' : '🇵🇹 PT'} · {e.business_type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={!e.is_active ? 'error' : e.plan_id ? 'success' : 'warning'}>
                    {!e.is_active ? 'Suspensa' : e.plan_id ? 'Activa' : 'Trial'}
                  </Badge>
                  <Badge variant={e.onboarding_completed ? 'success' : 'default'}>
                    {e.onboarding_completed ? 'Onboarding ✓' : 'Onboarding pendente'}
                  </Badge>
                  <select
                    value={e.plan_id ?? ''}
                    onChange={(ev) => plano.mutate({ e, planId: ev.target.value || null })}
                    disabled={plano.isPending}
                    className="h-9 px-2 rounded-lg border border-gray-300 text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sem plano (trial)</option>
                    {planos.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {e.is_active ? (
                    <Button size="sm" variant="outline" onClick={() => setASuspender(e)} className="flex items-center gap-1">
                      <ShieldOff className="w-3.5 h-3.5" /> Suspender
                    </Button>
                  ) : (
                    <Button size="sm" variant="primary" onClick={() => setAReactivar(e)} className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Reactivar
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setAAlterarPais(e)} className="flex items-center gap-1" title="Corrigir o país (operação sensível)">
                    <Globe className="w-3.5 h-3.5" /> País
                  </Button>
                </div>
              </div>

              {/* Owner principal + contagens agregadas (sem PII de clientes) */}
              <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-gray-400">Owner</p>
                  <p className="text-gray-800 truncate">{e.owner_name ?? <span className="text-amber-600">sem owner</span>}</p>
                  <p className="text-gray-500 truncate">{e.owner_email ?? '—'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Último acesso do owner</p>
                  <p className="text-gray-800">{fmtData(e.owner_last_login)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Utilizadores · Clientes</p>
                  <p className="text-gray-800">{e.user_count} · {e.client_count}</p>
                </div>
                <div>
                  <p className="text-gray-400">Marcações · Criada em</p>
                  <p className="text-gray-800">{e.booking_count} · {fmtData(e.created_at)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(estado.isError || plano.isError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{((estado.error ?? plano.error) as Error)?.message}</p>
        </div>
      )}

      <CriarEmpresaForm />

      {/* Confirmações de acções destrutivas/sensíveis */}
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

      {/* Alterar país (superadmin, confirmação forte). key remonta = estado fresco. */}
      <AlterarPaisModal
        key={aAlterarPais?.id ?? 'none'}
        empresa={aAlterarPais}
        isOpen={!!aAlterarPais}
        onClose={() => { setAAlterarPais(null); pais.reset() }}
        onConfirm={(country) => aAlterarPais && pais.mutate({ e: aAlterarPais, country })}
        isLoading={pais.isPending}
        error={pais.isError ? (pais.error as Error).message : null}
      />
    </div>
  )
}
