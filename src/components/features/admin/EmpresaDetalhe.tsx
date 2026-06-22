'use client'
// Detalhe e gestão completa de uma empresa (SOMENTE SUPERADMIN).
// Tudo o que o superadmin precisa para gerir um tenant sem tocar em código:
// editar dados, mudar plano, ligar/desligar funcionalidades, gerir o owner,
// corrigir país (sensível) e registar notas internas.
import React, { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Building2, CreditCard, ToggleLeft, UserCog, Globe, StickyNote,
  ShieldOff, ShieldCheck, KeyRound, Check,
} from 'lucide-react'
import { Badge }     from '@/components/design-system/Badge/Badge'
import { Button }    from '@/components/design-system/Button/Button'
import { Input }     from '@/components/design-system/Input/Input'
import { Modal }     from '@/components/design-system/Modal/Modal'
import LoadingState  from '@/components/design-system/LoadingState/LoadingState'
import ErrorState    from '@/components/design-system/ErrorState/ErrorState'
import ConfirmDialog from '@/components/design-system/ConfirmDialog/ConfirmDialog'
import { AlterarPaisModal } from '@/components/features/admin/AlterarPaisModal'
import { useFormWithZod } from '@/hooks/useFormWithZod'
import { createClient } from '@/lib/supabase/client'
import {
  obterEmpresaDetalhe, listarEmpresasAdmin, editarEmpresa,
  definirPlanoTenant, definirEstadoTenant, definirPaisTenant,
  listarFeatureFlags, definirFeatureFlag, FEATURE_FLAGS_CATALOGO,
  redefinirPasswordOwner, type EmpresaAdmin,
} from '@/services/admin'
import { editarEmpresaSchema, type EditarEmpresaInput } from '@/lib/validators/admin'
import type { MarketCountry } from '@/lib/i18n/market'
import type { TenantNiche } from '@/types/domain/tenant'

const NICHE_LABELS: Record<TenantNiche, string> = {
  estetica: 'Estética', veterinaria: 'Veterinária', barbearia: 'Barbearia',
  dentista: 'Dentista', oficina: 'Oficina', fisioterapia: 'Fisioterapia', outro: 'Outro',
}

async function listarPlanos() {
  const supabase = createClient()
  const { data, error } = await supabase.from('plans').select('id, name').order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as { id: string; name: string }[]
}

export function EmpresaDetalhe({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient()
  const [aSuspender, setASuspender] = useState(false)
  const [aReactivar, setAReactivar] = useState(false)
  const [aAlterarPais, setAAlterarPais] = useState(false)
  const [resetAberto, setResetAberto]   = useState(false)

  const detalheKey = ['admin-empresa', tenantId] as const

  const { data: tenant, isLoading, error } = useQuery({ queryKey: detalheKey, queryFn: () => obterEmpresaDetalhe(tenantId) })
  const { data: lista = [] } = useQuery({ queryKey: ['admin-empresas'], queryFn: listarEmpresasAdmin })
  const { data: planos = [] } = useQuery({ queryKey: ['admin-plans'], queryFn: listarPlanos })
  const { data: flags = [] } = useQuery({ queryKey: ['admin-flags', tenantId], queryFn: () => listarFeatureFlags(tenantId) })

  const empresaAdmin: EmpresaAdmin | undefined = lista.find((e) => e.id === tenantId)

  function invalidarTudo() {
    void qc.invalidateQueries({ queryKey: detalheKey })
    void qc.invalidateQueries({ queryKey: ['admin-empresas'] })
    void qc.invalidateQueries({ queryKey: ['admin-flags', tenantId] })
  }

  const editar = useMutation({
    mutationFn: (d: EditarEmpresaInput) => editarEmpresa(tenantId, d),
    onSuccess:  invalidarTudo,
  })
  const plano = useMutation({
    mutationFn: (planId: string | null) => definirPlanoTenant(tenantId, planId, tenant?.name),
    onSuccess:  invalidarTudo,
  })
  const estado = useMutation({
    mutationFn: (ativo: boolean) => definirEstadoTenant(tenantId, ativo, tenant?.name),
    onSuccess:  () => { invalidarTudo(); setASuspender(false); setAReactivar(false) },
  })
  const pais = useMutation({
    mutationFn: (country: MarketCountry) => definirPaisTenant(tenantId, country, tenant?.name),
    onSuccess:  () => { invalidarTudo(); setAAlterarPais(false) },
  })
  const flag = useMutation({
    mutationFn: ({ f, on }: { f: string; on: boolean }) => definirFeatureFlag(tenantId, f, on, tenant?.name),
    onSuccess:  () => void qc.invalidateQueries({ queryKey: ['admin-flags', tenantId] }),
  })

  if (isLoading) return <LoadingState message="A carregar empresa..." />
  if (error || !tenant) return <ErrorState title="Erro ao carregar empresa" description={(error as Error)?.message ?? 'Empresa não encontrada'} />

  const sett = (tenant.settings ?? {}) as Record<string, string | undefined>
  const paisLabel = tenant.country === 'BR' ? '🇧🇷 Brasil' : '🇵🇹 Portugal'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Voltar + cabeçalho */}
      <div>
        <Link href="/admin/empresas" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors mb-3">
          <ArrowLeft className="w-4 h-4" /> Empresas
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-500/25">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{tenant.name}</h1>
              <p className="text-xs text-slate-500 font-mono">{tenant.slug} · {paisLabel} · {NICHE_LABELS[tenant.business_type as TenantNiche]}</p>
            </div>
          </div>
          <Badge variant={!tenant.is_active ? 'error' : tenant.plan_id ? 'success' : 'warning'}>
            {!tenant.is_active ? 'Suspensa' : tenant.plan_id ? 'Activa' : 'Trial'}
          </Badge>
        </div>
      </div>

      {/* ── Dados da empresa (editável) ── */}
      <Cartao icon={<Building2 className="w-4 h-4" />} titulo="Dados da empresa">
        <FormEditar
          tenant={{
            name: tenant.name, slug: tenant.slug, phone: tenant.phone ?? '', email: tenant.email ?? '',
            business_type: tenant.business_type, website: sett.website ?? '', instagram: sett.instagram ?? '',
            facebook: sett.facebook ?? '', google_maps_url: sett.google_maps_url ?? '', admin_notes: tenant.admin_notes ?? '',
          }}
          onSave={(d) => editar.mutateAsync(d)}
          isPending={editar.isPending}
          isSuccess={editar.isSuccess}
          error={editar.isError ? (editar.error as Error).message : null}
        />
      </Cartao>

      {/* ── Plano ── */}
      <Cartao icon={<CreditCard className="w-4 h-4" />} titulo="Plano de subscrição">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={tenant.plan_id ?? ''}
            onChange={(e) => plano.mutate(e.target.value || null)}
            disabled={plano.isPending}
            className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300"
          >
            <option value="">Sem plano (trial)</option>
            {planos.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {plano.isPending && <span className="text-xs text-slate-400">A guardar...</span>}
          {plano.isSuccess && <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><Check className="w-3.5 h-3.5" /> Guardado</span>}
          <Link href="/admin/planos" className="text-xs text-indigo-600 hover:underline ml-auto">Gerir planos →</Link>
        </div>
      </Cartao>

      {/* ── Funcionalidades (feature flags) ── */}
      <Cartao icon={<ToggleLeft className="w-4 h-4" />} titulo="Funcionalidades">
        <div className="space-y-2">
          {FEATURE_FLAGS_CATALOGO.map((f) => {
            const ativo = flags.find((x) => x.flag_name === f.flag)?.is_enabled ?? false
            return (
              <div key={f.flag} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/60 border border-slate-100">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{f.label}</p>
                  <p className="text-xs text-slate-500">{f.desc}</p>
                </div>
                <Toggle ativo={ativo} disabled={flag.isPending} onChange={(on) => flag.mutate({ f: f.flag, on })} />
              </div>
            )
          })}
        </div>
        {flag.isError && <p className="text-xs text-red-600 mt-2">{(flag.error as Error).message}</p>}
      </Cartao>

      {/* ── Owner ── */}
      <Cartao icon={<UserCog className="w-4 h-4" />} titulo="Proprietário (owner)">
        {empresaAdmin?.owner_id ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{empresaAdmin.owner_name ?? 'Sem nome'}</p>
              <p className="text-xs text-slate-500 truncate">{empresaAdmin.owner_email ?? '—'}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setResetAberto(true)} className="gap-1.5">
              <KeyRound className="w-3.5 h-3.5" /> Redefinir palavra-passe
            </Button>
          </div>
        ) : (
          <p className="text-sm text-amber-600">Esta empresa não tem owner associado.</p>
        )}
      </Cartao>

      {/* ── Acções sensíveis ── */}
      <Cartao icon={<Globe className="w-4 h-4" />} titulo="Acções avançadas">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setAAlterarPais(true)} className="gap-1.5">
            <Globe className="w-3.5 h-3.5" /> Alterar país
          </Button>
          {tenant.is_active ? (
            <Button size="sm" variant="outline" onClick={() => setASuspender(true)} className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50">
              <ShieldOff className="w-3.5 h-3.5" /> Suspender empresa
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setAReactivar(true)} className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
              <ShieldCheck className="w-3.5 h-3.5" /> Reactivar empresa
            </Button>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-3">Alterar o país muda moeda, fuso e tipo de documento fiscal — exige confirmação forte.</p>
      </Cartao>

      {/* Modais / confirmações */}
      <ConfirmDialog
        isOpen={aSuspender}
        onClose={() => { setASuspender(false); estado.reset() }}
        onConfirm={() => estado.mutate(false)}
        title="Suspender empresa"
        description={`Suspender "${tenant.name}"? O acesso ao dashboard fica bloqueado até reactivar. Os dados são preservados.`}
        confirmLabel="Suspender"
        isLoading={estado.isPending}
        error={estado.isError ? (estado.error as Error).message : null}
      />
      <ConfirmDialog
        isOpen={aReactivar}
        onClose={() => { setAReactivar(false); estado.reset() }}
        onConfirm={() => estado.mutate(true)}
        title="Reactivar empresa"
        description={`Reactivar "${tenant.name}"? O acesso ao dashboard é restaurado.`}
        confirmLabel="Reactivar"
        isLoading={estado.isPending}
        error={estado.isError ? (estado.error as Error).message : null}
      />
      <AlterarPaisModal
        key={tenant.id}
        empresa={empresaAdmin ?? null}
        isOpen={aAlterarPais}
        onClose={() => { setAAlterarPais(false); pais.reset() }}
        onConfirm={(country) => pais.mutate(country)}
        isLoading={pais.isPending}
        error={pais.isError ? (pais.error as Error).message : null}
      />
      <ResetPasswordModal
        isOpen={resetAberto}
        onClose={() => setResetAberto(false)}
        ownerNome={empresaAdmin?.owner_name ?? empresaAdmin?.owner_email ?? 'o owner'}
        onConfirm={(pw) => redefinirPasswordOwner(tenantId, empresaAdmin!.owner_id!, pw)}
      />
    </div>
  )
}

// ── Cartão genérico premium ──────────────────────────────────────────────────
function Cartao({ icon, titulo, children }: { icon: React.ReactNode; titulo: string; children: React.ReactNode }) {
  return (
    <section className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600">{icon}</span>
        <h2 className="text-sm font-semibold text-slate-800">{titulo}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

// ── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ ativo, disabled, onChange }: { ativo: boolean; disabled?: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ativo}
      disabled={disabled}
      onClick={() => onChange(!ativo)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50 ${ativo ? 'bg-indigo-600' : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ${ativo ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  )
}

// ── Formulário de edição ─────────────────────────────────────────────────────
function FormEditar({
  tenant, onSave, isPending, isSuccess, error,
}: {
  tenant: EditarEmpresaInput
  onSave: (d: EditarEmpresaInput) => Promise<unknown>
  isPending: boolean; isSuccess: boolean; error: string | null
}) {
  const form = useFormWithZod(editarEmpresaSchema, { defaultValues: tenant })
  const NICHES: TenantNiche[] = ['estetica', 'veterinaria', 'barbearia', 'dentista', 'oficina', 'fisioterapia', 'outro']

  return (
    <form onSubmit={form.handleSubmit((d) => { void onSave(d) })} noValidate className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Nome da empresa" error={form.formState.errors.name?.message} {...form.register('name')} />
        <Input label="Identificador (slug)" error={form.formState.errors.slug?.message} {...form.register('slug')} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="E-mail" type="email" error={form.formState.errors.email?.message} {...form.register('email')} />
        <Input label="Telefone" type="tel" error={form.formState.errors.phone?.message} {...form.register('phone')} />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Nicho de negócio</label>
        <select
          {...form.register('business_type')}
          className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300"
        >
          {NICHES.map((n) => <option key={n} value={n}>{NICHE_LABELS[n]}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Website" placeholder="https://..." error={form.formState.errors.website?.message} {...form.register('website')} />
        <Input label="Instagram" placeholder="@empresa" error={form.formState.errors.instagram?.message} {...form.register('instagram')} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Facebook" placeholder="facebook.com/empresa" error={form.formState.errors.facebook?.message} {...form.register('facebook')} />
        <Input label="Google Maps" placeholder="https://maps.app.goo.gl/..." error={form.formState.errors.google_maps_url?.message} {...form.register('google_maps_url')} />
      </div>
      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1">
          <StickyNote className="w-3.5 h-3.5 text-slate-400" /> Notas internas (só administração)
        </label>
        <textarea
          rows={3}
          placeholder="Contexto comercial, histórico, observações... (nunca visível ao tenant)"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300"
          {...form.register('admin_notes')}
        />
        {form.formState.errors.admin_notes && <p className="mt-1 text-xs text-red-600">{form.formState.errors.admin_notes.message}</p>}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-sm text-red-700">{error}</p></div>}

      <div className="flex items-center gap-3">
        <Button type="submit" isLoading={isPending} disabled={isPending} className="bg-gradient-to-br from-indigo-500 to-indigo-700">Guardar alterações</Button>
        {isSuccess && <span className="inline-flex items-center gap-1 text-sm text-emerald-600"><Check className="w-4 h-4" /> Guardado!</span>}
      </div>
    </form>
  )
}

// ── Modal de reset de palavra-passe do owner ─────────────────────────────────
function ResetPasswordModal({
  isOpen, onClose, ownerNome, onConfirm,
}: {
  isOpen: boolean; onClose: () => void; ownerNome: string; onConfirm: (pw: string) => Promise<void>
}) {
  const [pw, setPw] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  function fechar() { setPw(''); setErro(null); setOk(false); setLoading(false); onClose() }

  async function confirmar() {
    setErro(null); setLoading(true)
    try { await onConfirm(pw); setOk(true) }
    catch (e) { setErro((e as Error).message) }
    finally { setLoading(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={fechar} title="Redefinir palavra-passe do owner" size="sm">
      {ok ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-600">
            <Check className="w-5 h-5" />
            <p className="text-sm font-medium">Palavra-passe redefinida.</p>
          </div>
          <p className="text-sm text-slate-600">Comunique a nova palavra-passe a {ownerNome} por um canal seguro. Recomende que a altere no primeiro acesso (A minha conta).</p>
          <Button fullWidth onClick={fechar}>Fechar</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Define uma palavra-passe temporária para <strong>{ownerNome}</strong>. Ele poderá alterá-la depois em &quot;A minha conta&quot;.</p>
          <Input
            label="Nova palavra-passe"
            type="text"
            autoComplete="off"
            placeholder="Mínimo 8 caracteres"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          {erro && <div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-sm text-red-700">{erro}</p></div>}
          <div className="flex gap-2">
            <Button variant="outline" onClick={fechar} disabled={loading} fullWidth>Cancelar</Button>
            <Button onClick={confirmar} isLoading={loading} disabled={loading || pw.length < 8} fullWidth>Redefinir</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
