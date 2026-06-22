'use client'
// Diagnóstico de auth/tenant/profile/RLS — corre tudo no browser e mostra o
// resultado real de cada camada. Útil quando "algo não funciona": vê-se logo
// se é sessão, perfil, tenant, RLS ou UI.
import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { carregarPerfil, carregarTenant } from '@/services/tenant'
import { forceLogout } from '@/lib/auth/logout'

type Estado = Record<string, unknown>

export function DiagnosticsClient() {
  const [d, setD] = useState<Estado>({ estado: 'a recolher…' })

  useEffect(() => {
    (async () => {
      const out: Estado = {}
      const supabase = createClient()

      // auth.getUser
      try {
        const { data, error } = await supabase.auth.getUser()
        out['auth.getUser'] = error ? `ERRO: ${error.message}` : (data.user ? 'OK' : 'sem user')
        out['user.id'] = data.user?.id ?? null
        out['user.email'] = data.user?.email ?? null
        out['app_metadata.tenant_id'] = (data.user?.app_metadata as { tenant_id?: string })?.tenant_id ?? null
      } catch (e) { out['auth.getUser'] = `EXCEPÇÃO: ${(e as Error).message}` }

      // auth.getSession
      try {
        const { data } = await supabase.auth.getSession()
        out['session exists'] = !!data.session
        out['session.expires_at'] = data.session?.expires_at ?? null
      } catch (e) { out['getSession'] = `EXCEPÇÃO: ${(e as Error).message}` }

      // carregarPerfil
      try {
        const p = await carregarPerfil()
        out['profile.id'] = p?.id ?? null
        out['profile.role'] = p?.role ?? null
        out['profile.tenant_id'] = p?.tenant_id ?? null
      } catch (e) { out['carregarPerfil'] = `ERRO: ${(e as Error).message}` }

      // carregarTenant
      try {
        const tid = (out['profile.tenant_id'] as string | null) ?? (out['app_metadata.tenant_id'] as string | null)
        if (tid) {
          const t = await carregarTenant(tid)
          out['tenant.name'] = t?.name ?? null
          out['tenant.country'] = t?.country ?? null
          out['tenant.onboarding_completed'] = t?.onboarding_completed ?? null
        } else {
          out['tenant'] = 'sem tenant_id'
        }
      } catch (e) { out['carregarTenant'] = `ERRO: ${(e as Error).message}` }

      // cookies Supabase no browser
      out['cookies sb-* presentes'] = typeof document !== 'undefined'
        ? document.cookie.split(';').some((c) => c.trim().startsWith('sb-'))
        : 'n/d'

      // health check
      try {
        const r = await fetch('/api/health')
        out['/api/health'] = `${r.status} ${(await r.json()).status ?? ''}`
      } catch (e) { out['/api/health'] = `ERRO: ${(e as Error).message}` }

      out['app version'] = 'v1.0.0'
      out['estado'] = 'completo'
      setD(out)
    })()
  }, [])

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-lg font-bold text-gray-900 mb-1">Diagnóstico (dev)</h1>
        <p className="text-xs text-gray-500 mb-4">Estado real de auth / perfil / tenant / RLS / health.</p>
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {Object.entries(d).map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-4 px-4 py-2 text-sm">
              <span className="text-gray-500 font-mono text-xs">{k}</span>
              <span className="text-gray-900 font-mono text-xs text-right break-all">{String(v)}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => void forceLogout()}
          className="mt-4 h-10 px-4 rounded-lg bg-gray-900 text-white text-sm font-medium"
        >
          forceLogout()
        </button>
      </div>
    </main>
  )
}
