'use client'
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import SectionHeader    from '@/components/design-system/SectionHeader/SectionHeader'
import { Button }       from '@/components/design-system/Button/Button'
import AccessDenied     from '@/components/design-system/AccessDenied/AccessDenied'
import { ColorPicker }  from '@/components/features/branding/ColorPicker'
import { LogoUpload }   from '@/components/features/branding/LogoUpload'
import { BrandingPreview } from '@/components/features/branding/BrandingPreview'
import { usePermissions }  from '@/hooks/usePermissions'
import { useAuth }         from '@/providers/AuthProvider'
import { useSalvarBranding } from '@/hooks/useBranding'
import { brandingSettingsSchema, type BrandingSettingsInput } from '@/lib/validators/branding'
import type { TenantSettings } from '@/types/domain/tenant'
import { DEFAULT_PRIMARY_COLOR } from '@/types/domain/tenant'

export function PainelBranding() {
  const { isOwner }     = usePermissions()
  const { tenant }      = useAuth()

  const tenantSettings  = tenant?.settings as TenantSettings | null | undefined
  const currentBranding = tenantSettings?.branding

  const brandingForm = useForm<BrandingSettingsInput>({
    resolver: zodResolver(brandingSettingsSchema),
    defaultValues: {
      primary_color:   currentBranding?.primary_color ?? DEFAULT_PRIMARY_COLOR,
      logo_url:        currentBranding?.logo_url       ?? '',
      // Apenas tema claro nesta fase — dark/system não têm CSS implementado
      theme_mode:      'light',
    },
  })

  const salvarBrandingMutation = useSalvarBranding()

  async function onSubmitBranding(data: BrandingSettingsInput) {
    await salvarBrandingMutation.mutateAsync(data)
  }

  return (
    <div className="max-w-2xl space-y-6">
      {!isOwner && (
        <AccessDenied
          title="Apenas o Proprietário pode editar o branding"
          description="Contacte o proprietário da conta para alterar as cores e o logótipo."
        />
      )}
      {isOwner && (
        <form onSubmit={brandingForm.handleSubmit(onSubmitBranding)} className="space-y-6">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm p-6">
            <SectionHeader title="Identidade da empresa" />
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Defina o logótipo e a cor principal da sua empresa.
            </p>

            {/* Aviso: marca da empresa ≠ marca do produto */}
            <div className="flex items-start gap-2 p-3 mb-6 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-base leading-none mt-0.5">ℹ️</span>
              <p className="text-xs text-slate-600">
                Este logótipo representa a <strong>sua empresa</strong> dentro do ExodoFlow Pro
                (aparece no topo do painel e nos seus relatórios). <strong>Não substitui</strong> a
                marca do produto ExodoFlow Pro.
              </p>
            </div>

            <div className="space-y-6">
              <LogoUpload
                currentLogoUrl={brandingForm.watch('logo_url') || undefined}
                onUpload={(url) => brandingForm.setValue('logo_url', url)}
                onRemove={() => brandingForm.setValue('logo_url', '')}
              />

              <ColorPicker
                label="Cor principal"
                value={brandingForm.watch('primary_color')}
                onChange={(color) => brandingForm.setValue('primary_color', color)}
              />
              {brandingForm.formState.errors.primary_color && (
                <p className="text-sm text-red-500">{brandingForm.formState.errors.primary_color.message}</p>
              )}
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm p-6">
            <BrandingPreview
              branding={{ primary_color: brandingForm.watch('primary_color') }}
              tenantName={tenant?.name ?? 'Empresa'}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" isLoading={salvarBrandingMutation.isPending}>
              Guardar branding
            </Button>
            {salvarBrandingMutation.isSuccess && (
              <span className="text-sm text-green-600">Guardado com sucesso!</span>
            )}
            {salvarBrandingMutation.isError && (
              <span className="text-sm text-red-500">
                {salvarBrandingMutation.error.message}
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
