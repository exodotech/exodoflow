'use client'
import React, { useState, useRef, useEffect } from 'react'
import Link            from 'next/link'
import { UserCircle, LogOut, User } from 'lucide-react'
import { useAuth }        from '@/providers/AuthProvider'
import { forceLogout }    from '@/lib/auth/logout'
import type { TenantSettings } from '@/types/domain/tenant'

export function MobileHeader() {
  const { tenant, profile } = useAuth()
  const settings = tenant?.settings as TenantSettings | null | undefined
  const logoUrl  = settings?.branding?.logo_url

  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fechar menu ao clicar fora
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function handleLogout() { setOpen(false); void forceLogout() }

  return (
    <header className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="h-14 px-4 flex items-center justify-between">
        {/* Logo + nome do tenant */}
        <div className="flex items-center gap-2 min-w-0">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={tenant?.name ?? 'Logo'} className="w-7 h-7 rounded-md object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
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

        {/* Menu do utilizador */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu da conta"
            aria-expanded={open}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200"
          >
            <UserCircle className="w-6 h-6" />
          </button>

          {open && (
            <div className="absolute right-0 top-11 w-52 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
              {/* Info do utilizador */}
              {profile && (
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-900 truncate">{profile.full_name ?? 'Utilizador'}</p>
                  <p className="text-xs text-gray-400 truncate">{profile.role}</p>
                </div>
              )}
              <Link
                href="/dashboard/perfil"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <User className="w-4 h-4 text-gray-400" />
                A minha conta
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                Terminar sessão
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default MobileHeader
