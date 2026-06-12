// Layout do onboarding — Server Component
// Protege a rota: autentica, bloqueia STAFF e redireciona se já concluído
import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Carregar perfil para verificar role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  // SUPERADMIN não faz onboarding — vai para o painel de administração
  if (profile?.role === 'superadmin') redirect('/admin')

  // STAFF não acede ao onboarding — ir para o dashboard
  if (profile?.role === 'staff') redirect('/dashboard')

  // Se já completou o onboarding → ir para o dashboard
  if (profile?.tenant_id) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('onboarding_completed')
      .eq('id', profile.tenant_id)
      .single()

    if (tenant?.onboarding_completed) redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {children}
    </div>
  )
}
