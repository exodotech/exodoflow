// Layout do painel de administração — Server Component
// SOMENTE SUPERADMIN. Qualquer outro role é redirecionado para o dashboard.
import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminNav }     from '@/components/features/admin/AdminNav'
import { AdminUserMenu } from '@/components/features/admin/AdminUserMenu'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verificação de role no servidor — não confiar no cliente
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'superadmin') redirect('/dashboard')

  return (
    <div className="min-h-screen app-bg">
      {/* Header de sistema — gradiente dark com identidade de plataforma */}
      <header className="relative bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-white/[0.06]">
        {/* Brilho decorativo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{ background: 'radial-gradient(ellipse 60% 100% at 30% 0%, rgba(99,102,241,0.25), transparent)' }}
        />
        <div className="relative max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 font-bold text-sm text-white shadow-lg shadow-indigo-900/40">
              E
            </span>
            <div className="leading-tight">
              <p className="font-semibold text-sm text-white tracking-tight">ExodoFlow</p>
              <p className="text-xs text-slate-400">Administração do Sistema</p>
            </div>
          </div>
          <AdminUserMenu email={user.email ?? null} />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <AdminNav />
        {children}
      </main>
    </div>
  )
}
