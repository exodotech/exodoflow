'use client'
import React, { useState } from 'react'
import { Lock } from 'lucide-react'
import SectionHeader from '@/components/design-system/SectionHeader/SectionHeader'
import { Button }   from '@/components/design-system/Button/Button'
import { Input }    from '@/components/design-system/Input/Input'
import { useAuth }  from '@/providers/AuthProvider'
import { usePermissions } from '@/hooks/usePermissions'
import { useFormWithZod } from '@/hooks/useFormWithZod'
import { useAtualizarEmpresa } from '@/hooks/useEmpresa'
import { atualizarEmpresaSchema, type AtualizarEmpresaInput } from '@/lib/validators/empresa'
import {
  getTaxIdOptions, getTaxIdLabel, getTaxIdPlaceholder, defaultTaxIdType,
} from '@/lib/i18n/tax-id'
import type { TenantNiche, SupportedLocale } from '@/types/domain'

const NICHE_LABELS: Record<TenantNiche, string> = {
  estetica: 'Estética', veterinaria: 'Veterinária', barbearia: 'Barbearia',
  dentista: 'Dentista', oficina: 'Oficina', fisioterapia: 'Fisioterapia', outro: 'Outro',
}

const SUPORTE_NOTA = 'Definido na criação da empresa. Para alterar, contacte o suporte.'

interface PainelEmpresaProps {
  settings: { timezone: string; currency: string; slot_interval_minutes: number; locale?: SupportedLocale } | null
}

export function PainelEmpresa({ settings }: PainelEmpresaProps) {
  const { tenant }  = useAuth()
  const { isOwner } = usePermissions()
  const [editar, setEditar] = useState(false)
  const atualizar = useAtualizarEmpresa()

  // Dados actuais vindos do tenant real (colunas + JSONB)
  const addr = (tenant?.address ?? {}) as {
    street?: string; address_line2?: string; city?: string; region?: string; postal_code?: string
  }
  const sett = (tenant?.settings ?? {}) as {
    website?: string; tax_id?: string; tax_id_type?: 'nif' | 'cpf' | 'cnpj'
    instagram?: string; facebook?: string; google_maps_url?: string; internal_notes?: string
  }

  // Locale do mercado (define o campo fiscal: PT→NIF; BR→CPF/CNPJ)
  const locale: SupportedLocale = tenant?.country === 'BR' ? 'pt-BR' : 'pt-PT'

  const defaults: AtualizarEmpresaInput = {
    name:            tenant?.name ?? '',
    slug:            tenant?.slug ?? '',
    phone:           tenant?.phone ?? '',
    email:           tenant?.email ?? '',
    website:         sett.website ?? '',
    tax_id:          sett.tax_id ?? '',
    tax_id_type:     sett.tax_id_type ?? defaultTaxIdType(locale),
    street:          addr.street ?? '',
    address_line2:   addr.address_line2 ?? '',
    city:            addr.city ?? '',
    region:          addr.region ?? '',
    postal_code:     addr.postal_code ?? '',
    instagram:       sett.instagram ?? '',
    facebook:        sett.facebook ?? '',
    google_maps_url: sett.google_maps_url ?? '',
    internal_notes:  sett.internal_notes ?? '',
  }

  const form = useFormWithZod(atualizarEmpresaSchema, { defaultValues: defaults })

  // Tipo fiscal escolhido (reativo). PT fica sempre 'nif'; BR alterna CPF/CNPJ.
  const tipoFiscal     = form.watch('tax_id_type') ?? defaultTaxIdType(locale)
  const opcoesFiscais  = getTaxIdOptions(locale)
  const fiscalLabel    = getTaxIdLabel(locale, tipoFiscal)

  if (!tenant) {
    return <p className="text-sm text-gray-500 italic">Dados da empresa indisponíveis. Tente recarregar a página.</p>
  }

  const nichoLabel = NICHE_LABELS[tenant.business_type as TenantNiche] ?? tenant.business_type
  const paisLabel  = tenant.country === 'BR' ? '🇧🇷 Brasil' : '🇵🇹 Portugal'

  // Labels de morada conforme o país (estrutural, definido na criação)
  const isBR = tenant.country === 'BR'
  const L = {
    line1:      isBR ? 'Endereço'   : 'Morada',
    line2:      'Complemento',
    city:       'Cidade',
    region:     isBR ? 'Estado'     : 'Distrito',
    postalCode: isBR ? 'CEP'        : 'Código postal',
  }
  const moradaResumo = [addr.street, addr.address_line2, addr.postal_code, addr.city, addr.region]
    .filter(Boolean).join(', ') || '—'

  async function onSubmit(data: AtualizarEmpresaInput) {
    atualizar.reset()
    await atualizar.mutateAsync(data).then(() => setEditar(false)).catch(() => {})
  }

  function cancelar() { form.reset(defaults); atualizar.reset(); setEditar(false) }

  return (
    <div className="max-w-2xl space-y-6">
      {/* País e nicho — IMUTÁVEIS após a criação */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SectionHeader title="País e Nicho" />
        <div className="grid grid-cols-2 gap-4 mt-4">
          <CampoBloqueado label="País" valor={paisLabel} />
          <CampoBloqueado label="Nicho" valor={nichoLabel} />
        </div>
        <div className="mt-4 flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <Lock className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600">{SUPORTE_NOTA}</p>
        </div>
      </div>

      {/* Dados operacionais editáveis */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SectionHeader title="Dados da Empresa" />

        {!editar && (
          <>
            <div className="space-y-4 mt-4">
              <Campo label="Nome" valor={tenant.name} />
              <Campo label="Slug" valor={tenant.slug} mono />
              <Campo label="E-mail" valor={tenant.email ?? '—'} />
              <Campo label="Telefone" valor={tenant.phone ?? '—'} />
              <Campo label="Website" valor={sett.website || '—'} />
              <Campo label={fiscalLabel} valor={sett.tax_id || '—'} />
              <Campo label={L.line1} valor={moradaResumo} />
              <Campo label="Instagram" valor={sett.instagram || '—'} />
              <Campo label="Facebook" valor={sett.facebook || '—'} />
              <Campo label="Google Maps" valor={sett.google_maps_url || '—'} />
              <Campo label="Observações internas" valor={sett.internal_notes || '—'} />
            </div>
            <div className="mt-6">
              {isOwner ? (
                <Button size="sm" onClick={() => { form.reset(defaults); setEditar(true) }}>Editar dados</Button>
              ) : (
                <p className="text-xs text-gray-400">Apenas o proprietário pode editar os dados da empresa.</p>
              )}
            </div>
          </>
        )}

        {editar && isOwner && (
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4 mt-4">
            <Input label="Nome da empresa" error={form.formState.errors.name?.message} {...form.register('name')} />
            <Input label="Identificador (slug)" error={form.formState.errors.slug?.message} {...form.register('slug')} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="E-mail" type="email" error={form.formState.errors.email?.message} {...form.register('email')} />
              <Input label="Telefone" type="tel" error={form.formState.errors.phone?.message} {...form.register('phone')} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Website" placeholder="https://..." error={form.formState.errors.website?.message} {...form.register('website')} />
              {/* Campo fiscal país-aware: PT só NIF; BR escolhe CPF (PF) ou CNPJ (PJ) */}
              {locale === 'pt-BR' ? (
                <div className="grid grid-cols-[7rem_1fr] gap-2 items-start">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select
                      {...form.register('tax_id_type')}
                      className="w-full h-[42px] rounded-lg border border-gray-300 bg-white px-2 text-sm focus:border-[color:var(--tenant-primary)] focus:outline-none"
                    >
                      {opcoesFiscais.map((o) => (
                        <option key={o.type} value={o.type}>{o.short}</option>
                      ))}
                    </select>
                  </div>
                  <Input label={fiscalLabel} placeholder={getTaxIdPlaceholder(tipoFiscal)} error={form.formState.errors.tax_id?.message} {...form.register('tax_id')} />
                </div>
              ) : (
                <Input label={fiscalLabel} placeholder={getTaxIdPlaceholder(tipoFiscal)} error={form.formState.errors.tax_id?.message} {...form.register('tax_id')} />
              )}
            </div>
            <Input label={L.line1} placeholder={isBR ? 'Rua, número' : 'Rua, número'} error={form.formState.errors.street?.message} {...form.register('street')} />
            <Input label={`${L.line2} (opcional)`} placeholder={isBR ? 'Apto, bloco, referência' : 'Andar, fração, referência'} error={form.formState.errors.address_line2?.message} {...form.register('address_line2')} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label={L.city} error={form.formState.errors.city?.message} {...form.register('city')} />
              <Input label={L.region} error={form.formState.errors.region?.message} {...form.register('region')} />
              <Input label={L.postalCode} error={form.formState.errors.postal_code?.message} {...form.register('postal_code')} />
            </div>

            {/* Presença online + observações internas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Instagram" placeholder="@minhaempresa" error={form.formState.errors.instagram?.message} {...form.register('instagram')} />
              <Input label="Facebook" placeholder="facebook.com/minhaempresa" error={form.formState.errors.facebook?.message} {...form.register('facebook')} />
            </div>
            <Input label="Link do Google Maps" placeholder="https://maps.app.goo.gl/..." error={form.formState.errors.google_maps_url?.message} {...form.register('google_maps_url')} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações internas</label>
              <textarea
                rows={3}
                placeholder="Notas internas sobre a empresa (não visíveis ao cliente)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[color:var(--tenant-primary)] focus:outline-none"
                {...form.register('internal_notes')}
              />
              {form.formState.errors.internal_notes && (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.internal_notes.message}</p>
              )}
            </div>

            {atualizar.isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{(atualizar.error as Error).message}</p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" isLoading={atualizar.isPending} disabled={atualizar.isPending}>Guardar</Button>
              <Button type="button" variant="outline" onClick={cancelar} disabled={atualizar.isPending}>Cancelar</Button>
              {atualizar.isSuccess && <span className="text-sm text-green-600">Guardado!</span>}
            </div>
          </form>
        )}
      </div>

      {/* Configurações de Agenda — derivadas do país (leitura) */}
      {settings && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <SectionHeader title="Configurações de Agenda" />
          <div className="space-y-4 mt-4">
            <Campo label="Fuso horário" valor={settings.timezone} />
            <Campo label="Moeda" valor={settings.currency} />
            <Campo label="Intervalo de slots" valor={`${settings.slot_interval_minutes} minutos`} />
          </div>
          <p className="text-xs text-gray-400 mt-4">Fuso horário e moeda derivam do país — {SUPORTE_NOTA.toLowerCase()}</p>
        </div>
      )}
    </div>
  )
}

function Campo({ label, valor, mono }: { label: string; valor: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-sm text-gray-900${mono ? ' font-mono' : ''}`}>{valor}</p>
    </div>
  )
}

function CampoBloqueado({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
        {label} <Lock className="w-3 h-3 text-gray-400" />
      </p>
      <p className="text-sm text-gray-900">{valor}</p>
    </div>
  )
}
