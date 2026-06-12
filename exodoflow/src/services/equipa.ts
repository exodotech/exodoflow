// Serviço de gestão de equipa — membros do tenant (profiles)
// A criação de membros é feita pelo Route Handler /api/equipa/criar-membro
// (precisa da admin API). Listagem e gestão (estado/role) usam RLS normal.
import { createClient } from '@/lib/supabase/client'
import { assertMutationSuccess } from '@/lib/supabase/assertMutationSuccess'
import { registarAuditoria } from '@/services/audit'
import type { AppRole } from '@/types/domain/permission'

// Roles atribuíveis pela gestão de equipa (owner não é atribuível — há um por tenant)
export type RoleAtribuivel = 'manager' | 'receptionist' | 'staff'

export interface MembroEquipa {
  id:            string
  full_name:     string | null
  role:          AppRole
  is_active:     boolean
  created_at:    string
  last_login_at: string | null
  recurso:       string | null   // nome do recurso humano associado (se houver)
}

// Lista os membros do tenant com recurso associado e último acesso.
// profiles_select_manager_all garante que owner/manager vêem todos (incl. inactivos).
export async function listarEquipa(): Promise<MembroEquipa[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active, created_at, last_login_at, resources(name)')
    .neq('role', 'superadmin')
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) throw new Error(`Erro ao listar equipa: ${error.message}`)

  return (data ?? []).map((p) => {
    const recursos = (p as { resources?: Array<{ name: string }> | { name: string } | null }).resources
    const nome = Array.isArray(recursos) ? recursos[0]?.name ?? null : recursos?.name ?? null
    return {
      id:            p.id,
      full_name:     p.full_name,
      role:          p.role as AppRole,
      is_active:     p.is_active,
      created_at:    p.created_at,
      last_login_at: p.last_login_at,
      recurso:       nome,
    }
  })
}

// Lista recursos humanos (type=staff) ainda sem profissional vinculado.
export interface RecursoVinculavel { id: string; name: string }

export async function listarRecursosVinculaveis(): Promise<RecursoVinculavel[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('resources')
    .select('id, name')
    .eq('type', 'staff')
    .is('profile_id', null)
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) throw new Error(`Erro ao listar recursos: ${error.message}`)
  return (data ?? []) as RecursoVinculavel[]
}

// Activa/desactiva um membro (is_active). Owner/manager via profiles_update_manager.
// O trigger protect_last_owner impede suspender o único proprietário.
export async function definirEstadoMembro(profileId: string, ativo: boolean): Promise<void> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_active: ativo })
    .eq('id', profileId)
    .select('id')

  assertMutationSuccess(data, error, ativo ? 'reactivar membro' : 'desactivar membro')
  await registarAuditoria(ativo ? 'team.reactivate' : 'team.suspend', {
    table: 'profiles', recordId: profileId,
  })
}

// Altera a função de um membro (manager/receptionist/staff).
// owner não é atribuível por aqui. O trigger protect_last_owner impede despromover
// o único proprietário; o guard de auto-escalada (0015) impede mudar a própria role.
export async function alterarRoleMembro(profileId: string, role: RoleAtribuivel): Promise<void> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', profileId)
    .select('id')

  assertMutationSuccess(data, error, 'alterar função do membro')
  await registarAuditoria('team.role_change', { table: 'profiles', recordId: profileId, metadata: { role } })
}

// Regista o último acesso do utilizador autenticado (chamado após login).
export async function registarUltimoAcesso(): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  // Falha silenciosa: registar o acesso nunca deve bloquear o login
  await supabase.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', user.id)
}
