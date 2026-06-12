// Layout privado — verifica sessão no servidor antes de renderizar
// O middleware em middleware.ts já redireciona /dashboard sem sessão;
// esta verificação é defesa em profundidade adicional
import { redirect }           from 'next/navigation'
import { createClient }       from '@/lib/supabase/server'
import { DashboardLayout }    from '@/components/layout/DashboardLayout/DashboardLayout'
import { AuthProvider }       from '@/providers/AuthProvider'
import { BrandingProvider }   from '@/providers/BrandingProvider'
import type { Profile }       from '@/types/domain/profile'
import type { Tenant }        from '@/types/domain/tenant'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // Validar sessão: getUser() verifica o JWT no servidor Supabase.
  // try/catch: uma sessão corrompida (refresh token revogado) não pode crashar
  // o layout de TODAS as páginas — trata-se como não autenticado → login.
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    user = null
  }

  if (!user) redirect('/login')

  // Carregar perfil do utilizador (inclui role e tenant_id)
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Carregar tenant se existir
  let tenantData: Tenant | null = null
  if (profileData?.tenant_id) {
    const { data } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', profileData.tenant_id)
      .single()
    tenantData = data as Tenant | null
  }

  // SUPERADMIN não usa o dashboard de tenant — vai para o painel de administração
  if (profileData?.role === 'superadmin') redirect('/admin')

  // Tenant suspenso pelo SUPERADMIN (is_active = false) — bloqueia o acesso.
  // Vem ANTES do check de onboarding: um tenant suspenso não deve poder
  // continuar o onboarding nem usar o dashboard.
  if (tenantData && tenantData.is_active === false) redirect('/suspenso')

  // STAFF não faz onboarding — acede directamente ao dashboard
  const isStaff = profileData?.role === 'staff'

  // Redireciona para onboarding se:
  //   1. utilizador não é STAFF, E
  //   2. não tem tenant associado (tenantData null → conta criada mas onboarding nunca iniciado), OU
  //   3. tem tenant mas onboarding ainda não foi concluído
  // Sem este check, OWNER/MANAGER/RECEPTIONIST sem tenant ficavam presos no dashboard com dados a null
  if (!isStaff && (!tenantData || !tenantData.onboarding_completed)) {
    redirect('/onboarding')
  }

  return (
    // AuthProvider hidrata o contexto cliente com dados lidos no servidor
    // BrandingProvider lê o tenant do AuthProvider e aplica CSS vars + tema
    <AuthProvider
      initialUser={user}
      initialProfile={profileData as Profile | null}
      initialTenant={tenantData}
    >
      <BrandingProvider>
        <DashboardLayout>{children}</DashboardLayout>
      </BrandingProvider>
    </AuthProvider>
  )
}
