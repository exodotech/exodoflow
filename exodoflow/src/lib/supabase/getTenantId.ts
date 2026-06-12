// Lê o tenant_id do utilizador autenticado.
// Caminho rápido: app_metadata do JWT. Fallback: profiles.tenant_id —
// espelha o comportamento de auth_tenant_id() na BD (migração 0012), que
// cobre sessões cujo JWT ainda não recebeu o tenant_id.
import { createClient } from '@/lib/supabase/client'

export async function getTenantId(): Promise<string> {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) throw new Error('Sessão inválida — faça login novamente')

  const tenantId = user.app_metadata?.tenant_id as string | undefined
  if (tenantId) return tenantId

  // Fallback: ler do profile (a policy profiles_select_own garante acesso)
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (profile?.tenant_id) return profile.tenant_id

  throw new Error('Tenant não identificado na sessão')
}
