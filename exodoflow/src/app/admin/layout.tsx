// Layout do painel de administração — Server Component
// SOMENTE SUPERADMIN. Qualquer outro role é redirecionado para o dashboard.
import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminNav }     from '@/components/features/admin/AdminNav'

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg font-bold text-sm">E</span>
            <span className="font-semibold text-sm">ExodoFlow — Administração do Sistema</span>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-red-600/20 text-red-300 border border-red-500/30">
            SUPERADMIN
          </span>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <AdminNav />
        {children}
      </main>
    </div>
  )
}
