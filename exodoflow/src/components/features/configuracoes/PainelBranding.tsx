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
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <SectionHeader title="Identidade Visual" />
            <p className="text-sm text-gray-500 mt-1 mb-6">
              Personalize as cores e o logótipo da sua empresa. As alterações aplicam-se a toda a interface.
            </p>

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

          <div className="bg-white rounded-lg border border-gray-200 p-6">
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
