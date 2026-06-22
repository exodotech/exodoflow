// POST /api/admin/gerir-owner — gere o acesso do OWNER de uma empresa.
// SOMENTE SUPERADMIN. Acção suportada: definir nova palavra-passe temporária.
//
// Fluxo de segurança (defesa em camadas, igual a criar-empresa):
//   1. Rate limit
//   2. Sessão válida (cookie) — senão 401
//   3. Role do utilizador === 'superadmin' (lido da BD) — senão 403
//   4. Validar payload + confirmar que o owner_id pertence ao tenant_id indicado
//   5. Só então usa a service_role para alterar a palavra-passe
// A service_role NUNCA chega ao cliente: vive só neste handler server-side.
import { NextResponse }      from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { gerirOwnerSchema }  from '@/lib/validators/admin'
import { checkRateLimit, clientKeyFromRequest } from '@/lib/rate-limit'
import { logger }            from '@/lib/logger'

export async function POST(request: Request) {
  // 1. Rate limit
  const rl = checkRateLimit(`gerir-owner:${clientKeyFromRequest(request)}`, { limit: 10, windowMs: 60_000 })
  if (!rl.allowed) {
    logger.security('Rate limit excedido em gerir-owner', { action: 'admin.gerir_owner' })
    return NextResponse.json({ error: 'Demasiados pedidos. Tente novamente daqui a pouco.' }, { status: 429, headers: rl.headers })
  }

  // 2. Autenticação
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // 3. Autorização — confirmar role na BD
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  // 4. Validar payload
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 }) }

  const parsed = gerirOwnerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }
  const { tenant_id, owner_id, password } = parsed.data

  // 4b. Confirmar que o owner_id é mesmo owner DESTE tenant (evita reset cruzado)
  const admin = createAdminClient()
  const { data: alvo } = await admin
    .from('profiles').select('id, role, tenant_id').eq('id', owner_id).single()
  if (!alvo || alvo.tenant_id !== tenant_id || alvo.role !== 'owner') {
    return NextResponse.json({ error: 'Owner não corresponde à empresa indicada.' }, { status: 400 })
  }

  // 5. Definir nova palavra-passe via admin API (service_role)
  const { error } = await admin.auth.admin.updateUserById(owner_id, { password })
  if (error) {
    logger.warn('Falha ao redefinir palavra-passe do owner', { owner_id, erro: error.message })
    return NextResponse.json({ error: 'Não foi possível redefinir a palavra-passe.' }, { status: 400 })
  }

  logger.info('Palavra-passe do owner redefinida pelo superadmin', { owner_id, tenant_id })

  // Auditoria de sistema (usa a sessão do superadmin — RPC gated). Não bloqueia.
  try {
    await supabase.rpc('record_system_audit_log', {
      p_action:          'owner.reset_password',
      p_entity_type:     'profile',
      p_entity_id:       owner_id,
      p_target_tenant_id: tenant_id,
      p_description:     'Redefiniu a palavra-passe do owner',
    })
  } catch { /* auditoria nunca bloqueia */ }

  return NextResponse.json({ ok: true }, { status: 200 })
}
