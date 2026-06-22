// Serviço de perfil próprio — o utilizador edita os seus dados e a palavra-passe.
// Segurança: o trigger prevent_profile_self_escalation (0015) impede alterar
// role/tenant/is_active no próprio perfil, por isso aqui só se enviam dados pessoais.
import { createClient } from '@/lib/supabase/client'
import { assertMutationSuccess } from '@/lib/supabase/assertMutationSuccess'
import type { AtualizarPerfilInput } from '@/lib/validators/perfil'

// Actualiza nome e telefone do PRÓPRIO perfil (profiles_update_own).
export async function atualizarPerfilProprio(input: AtualizarPerfilInput): Promise<void> {
  const supabase = createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Sessão inválida — faça login novamente')

  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: input.full_name,
      phone:     input.phone || null,
    })
    .eq('id', user.id)
    .select('id')

  assertMutationSuccess(data, error, 'actualizar perfil')
}

// Altera a palavra-passe do utilizador autenticado (Supabase Auth).
export async function alterarPassword(novaPassword: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.auth.updateUser({ password: novaPassword })
  if (error) throw new Error(`Erro ao alterar palavra-passe: ${error.message}`)
}
