'use client'
// Menu do superadmin no header do painel /admin — dá acesso a terminar sessão.
// O painel admin não tem sidebar (ao contrário do dashboard do tenant), por isso
// o logout vive aqui. Usa forceLogout (à prova de sessão corrompida).
import React, { useState, useRef, useEffect } from 'react'
import { ShieldCheck, ChevronDown, LogOut } from 'lucide-react'
import { forceLogout } from '@/lib/auth/logout'

export function AdminUserMenu({ email }: { email: string | null }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Menu do administrador"
        className="inline-flex items-center gap-1.5 text-xs font-semibold pl-2.5 pr-2 py-1 rounded-full bg-indigo-500/15 text-indigo-200 border border-indigo-400/25 hover:bg-indigo-500/25 transition-colors"
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        SUPERADMIN
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 animate-slide-down">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-xs font-medium text-slate-900 truncate">{email ?? 'Administrador'}</p>
            <p className="text-xs text-slate-400">Administração do sistema</p>
          </div>
          <button
            onClick={() => { setOpen(false); void forceLogout() }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Terminar sessão
          </button>
        </div>
      )}
    </div>
  )
}
