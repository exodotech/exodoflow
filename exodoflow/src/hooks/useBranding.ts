// Hooks TanStack Query para branding do tenant
//
// IMPORTANTE: o tenant vive no estado do AuthProvider (hidratado do servidor),
// NÃO numa query TanStack. Invalidar query keys não actualizava nada — a cor
// só mudava após F5 (bug real corrigido). Agora cada mutação chama
// refreshTenant(), que relê o tenant da BD e o BrandingProvider re-aplica as
// CSS variables imediatamente.
import { useMutation } from '@tanstack/react-query'
import { useAuth }     from '@/providers/AuthProvider'
import { salvarBranding, uploadLogo, removerLogo } from '@/services/branding'
import type { BrandingSettingsInput } from '@/lib/validators/branding'

export function useSalvarBranding() {
  const { refreshTenant } = useAuth()
  return useMutation({
    mutationFn: (input: BrandingSettingsInput) => salvarBranding(input),
    onSuccess:  () => void refreshTenant(),
  })
}

export function useUploadLogo() {
  const { refreshTenant } = useAuth()
  return useMutation({
    mutationFn: (file: File) => uploadLogo(file),
    onSuccess:  () => void refreshTenant(),
  })
}

export function useRemoverLogo() {
  const { refreshTenant } = useAuth()
  return useMutation({
    mutationFn: removerLogo,
    onSuccess:  () => void refreshTenant(),
  })
}
