'use client'
// Aplica branding do tenant: CSS variable da cor primária.
// Branding simplificado — apenas --tenant-primary (sem cor secundária).
// Deve estar dentro de <AuthProvider> para aceder ao useAuth().
//
// NOTA: o tema claro/escuro é uma preferência POR UTILIZADOR, gerida pelo
// ThemeProvider (root layout) + ThemeToggle — não pelo tenant. Por isso este
// provider já não mexe na classe .dark (evita competir com o ThemeProvider).
import { useEffect, type ReactNode } from 'react'
import { useAuth }    from '@/providers/AuthProvider'
import { DEFAULT_PRIMARY_COLOR } from '@/types/domain/tenant'
import type { TenantSettings } from '@/types/domain/tenant'

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { tenant } = useAuth()

  const settings  = tenant?.settings as TenantSettings | null | undefined
  const branding  = settings?.branding
  const primary   = branding?.primary_color ?? DEFAULT_PRIMARY_COLOR

  useEffect(() => {
    document.documentElement.style.setProperty('--tenant-primary', primary)
  }, [primary])

  return <>{children}</>
}
