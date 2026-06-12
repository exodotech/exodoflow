'use client'
// Aplica branding do tenant: CSS variable da cor primária + classe de tema.
// Branding simplificado — apenas --tenant-primary (sem cor secundária).
// Deve estar dentro de <AuthProvider> para aceder ao useAuth().
import { useEffect, type ReactNode } from 'react'
import { useAuth }    from '@/providers/AuthProvider'
import {
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_THEME_MODE,
  type ThemeMode,
} from '@/types/domain/tenant'
import type { TenantSettings } from '@/types/domain/tenant'

function applyTheme(mode: ThemeMode) {
  const html = document.documentElement
  if (mode === 'dark') {
    html.classList.add('dark')
    html.classList.remove('light')
  } else if (mode === 'light') {
    html.classList.add('light')
    html.classList.remove('dark')
  } else if (mode === 'system') {
    html.classList.remove('dark', 'light')
  }
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { tenant } = useAuth()

  const settings  = tenant?.settings as TenantSettings | null | undefined
  const branding  = settings?.branding

  const primary   = branding?.primary_color ?? DEFAULT_PRIMARY_COLOR
  const themeMode = branding?.theme_mode    ?? DEFAULT_THEME_MODE

  useEffect(() => {
    document.documentElement.style.setProperty('--tenant-primary', primary)
  }, [primary])

  useEffect(() => {
    applyTheme(themeMode)
  }, [themeMode])

  return <>{children}</>
}
