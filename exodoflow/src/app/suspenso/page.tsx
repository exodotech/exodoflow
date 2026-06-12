// Página de conta suspensa — Server Component
// Mostrada quando o tenant tem is_active = false (suspenso pelo SUPERADMIN).
// Tem o seu próprio guard: não pode viver dentro de /dashboard (entraria em
// loop com o redirect do dashboard/layout).
import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/features/auth/LogoutButton'

export default async function SuspensoPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Carregar profile + tenant para validar que está MESMO suspenso
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  // Superadmin não tem tenant — não faz sentido nesta página
  if (profile?.role === 'superadmin') redirect('/admin')

  let isActive = true
  if (profile?.tenant_id) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('is_active')
      .eq('id', profile.tenant_id)
      .single()
    isActive = tenant?.is_active ?? true
  }

  // Se não está suspenso, não há nada a mostrar aqui — volta ao dashboard
  if (isActive) redirect('/dashboard')

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 rounded-full mb-4">
          <span className="text-amber-600 text-xl">⏸</span>
        </div>
        <h1 className="text-lg font-semibold text-gray-900 mb-2">
          Empresa suspensa
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Esta empresa está suspensa. Contacte o suporte para reactivar o acesso.
        </p>
        <LogoutButton />
      </div>
    </main>
  )
}
