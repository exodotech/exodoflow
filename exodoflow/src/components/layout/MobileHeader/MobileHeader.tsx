'use client'
// Header fixo no topo APENAS em mobile (md:hidden). Dá acesso à conta própria
// (/dashboard/perfil) — no telemóvel não há sidebar com a área do utilizador.
import React from 'react'
import Link  from 'next/link'
import { UserCircle } from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'
import type { TenantSettings } from '@/types/domain/tenant'

export function MobileHeader() {
  const { tenant } = useAuth()
  const settings = tenant?.settings as TenantSettings | null | undefined
  const logoUrl  = settings?.branding?.logo_url

  return (
    <header className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="h-14 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {logoUrl ? (
            // <img> resiliente (conteúdo de utilizador) — nunca derruba o header
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={tenant?.name ?? 'Logo'} className="w-7 h-7 rounded-md object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
          ) : (
            <span
              className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
              style={{ backgroundColor: 'var(--tenant-primary)' }}
            >
              {(tenant?.name ?? 'E').charAt(0).toUpperCase()}
            </span>
          )}
          <span className="text-sm font-semibold text-gray-900 truncate">
            {tenant?.name ?? 'ExodoFlow'}
          </span>
        </div>

        {/* Acesso à conta própria */}
        <Link
          href="/dashboard/perfil"
          aria-label="A minha conta"
          className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200"
        >
          <UserCircle className="w-6 h-6" />
        </Link>
      </div>
    </header>
  )
}

export default MobileHeader
