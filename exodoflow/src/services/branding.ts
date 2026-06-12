// Serviço de branding — guarda configurações visuais do tenant (cores, logo, tema)
// Logo vai para Supabase Storage; o resto vai para tenants.settings JSONB
import { createClient } from '@/lib/supabase/client'
import { assertMutationSuccess } from '@/lib/supabase/assertMutationSuccess'
import { registarAuditoria } from '@/services/audit'
import type { BrandingSettings } from '@/types/domain/tenant'
import type { BrandingSettingsInput } from '@/lib/validators/branding'

// Guarda as configurações de branding no settings JSONB do tenant
export async function salvarBranding(input: BrandingSettingsInput): Promise<void> {
  const supabase = createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Utilizador não autenticado')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) throw new Error('Perfil não encontrado')

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', profile.tenant_id)
    .single()

  if (tenantError || !tenant) throw new Error('Tenant não encontrado')

  const currentSettings = (tenant.settings ?? {}) as Record<string, unknown>
  const branding: BrandingSettings = {
    primary_color:   input.primary_color,
    logo_url:        input.logo_url || undefined,
    theme_mode:      input.theme_mode,
  }

  const updatedSettings = { ...currentSettings, branding }

  // .select('id') + assert: detecta bloqueio RLS (error=null + 0 linhas ≠ sucesso)
  const { data: updated, error: updateError } = await supabase
    .from('tenants')
    .update({ settings: updatedSettings })
    .eq('id', profile.tenant_id)
    .select('id')

  assertMutationSuccess(updated, updateError, 'guardar branding')
  await registarAuditoria('branding.update', { table: 'tenants', recordId: profile.tenant_id })
}

// Faz upload do logo para o Storage (pasta {tenant_id}/)
// Devolve a URL pública do ficheiro
export async function uploadLogo(file: File): Promise<string> {
  const supabase = createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Utilizador não autenticado')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) throw new Error('Perfil não encontrado')

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const path = `${profile.tenant_id}/logo.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('tenant-logos')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`)

  const { data: urlData } = supabase.storage
    .from('tenant-logos')
    .getPublicUrl(path)

  return urlData.publicUrl
}

// Remove o logo do Storage e limpa logo_url do settings
export async function removerLogo(): Promise<void> {
  const supabase = createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Utilizador não autenticado')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) throw new Error('Perfil não encontrado')

  // SVG removido da lista — formato bloqueado no upload por risco de XSS
  const extensions = ['png', 'jpg', 'jpeg', 'webp']
  for (const ext of extensions) {
    await supabase.storage
      .from('tenant-logos')
      .remove([`${profile.tenant_id}/logo.${ext}`])
  }

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', profile.tenant_id)
    .single()

  if (tenantError || !tenant) throw new Error('Tenant não encontrado')

  const currentSettings = (tenant.settings ?? {}) as Record<string, unknown>
  const branding = (currentSettings.branding ?? {}) as Record<string, unknown>
  const updatedBranding = { ...branding, logo_url: undefined }
  const updatedSettings = { ...currentSettings, branding: updatedBranding }

  const { data: updated, error: updateError } = await supabase
    .from('tenants')
    .update({ settings: updatedSettings })
    .eq('id', profile.tenant_id)
    .select('id')

  assertMutationSuccess(updated, updateError, 'remover logo do branding')
}
