// POST /api/equipa/criar-membro — o OWNER cria um membro da sua equipa.
// O membro entra no tenant EXISTENTE do owner (não cria um tenant novo).
//
// Segurança em camadas:
//   1. Sessão válida — senão 401
//   2. Role do autenticado === 'owner' (team.manage é exclusivo do owner) — senão 403
//   3. O membro recebe o tenant_id do PRÓPRIO owner (lido da BD) — o cliente
//      nunca escolhe o tenant; impossível injectar outro.
//
// Detalhe-chave (timing): o app_metadata custom da admin API só é aplicado
// DEPOIS do trigger AFTER INSERT. Por isso o sinal para o trigger saltar o
// provisionamento vai em user_metadata.join_tenant_id (gravado no próprio
// INSERT). Depois define-se o app_metadata.tenant_id para o JWT.
// A service_role vive apenas neste handler (server-side).
import { NextResponse }      from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { criarMembroSchema } from '@/lib/validators/equipa'
import { checkRateLimit, clientKeyFromRequest } from '@/lib/rate-limit'
import { logger }            from '@/lib/logger'

export async function POST(request: Request) {
  // 0. Rate limit (readiness — in-memory em dev; trocar por store distribuído em prod)
  const rl = checkRateLimit(`criar-membro:${clientKeyFromRequest(request)}`, { limit: 15, windowMs: 60_000 })
  if (!rl.allowed) {
    logger.security('Rate limit excedido em criar-membro', { action: 'equipa.criar_membro' })
    return NextResponse.json({ error: 'Demasiados pedidos. Tente novamente daqui a pouco.' }, { status: 429, headers: rl.headers })
  }

  // 1. Autenticação
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // 2. Autorização — owner do tenant (lido da BD, nunca do cliente)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner') {
    return NextResponse.json({ error: 'Apenas o proprietário pode gerir a equipa' }, { status: 403 })
  }
  if (!profile.tenant_id) {
    return NextResponse.json({ error: 'Tenant não identificado' }, { status: 400 })
  }
  const tenantId = profile.tenant_id

  // 3. Validar payload
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo do pedido inválido' }, { status: 400 })
  }

  const parsed = criarMembroSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }
  const { email, password, full_name, role, resource_id } = parsed.data

  // 4. Criar o utilizador. join_tenant_id em user_metadata faz o trigger saltar
  //    o provisionamento (o membro entra no tenant do owner, não cria um novo).
  const admin = createAdminClient()
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { join_tenant_id: tenantId, ...(full_name ? { full_name } : {}) },
  })

  if (error || !created.user) {
    const msg = error?.message.toLowerCase().includes('already')
      ? 'Já existe uma conta com este e-mail.'
      : 'Não foi possível criar o membro. Verifique os dados e tente novamente.'
    logger.warn('Falha ao criar membro de equipa', { email, erro: error?.message })
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const memberId = created.user.id

  // 5. Definir o tenant no app_metadata (para o JWT → auth_tenant_id() rápido).
  await admin.auth.admin.updateUserById(memberId, {
    app_metadata: { tenant_id: tenantId },
  })

  // 6. Criar o profile com o tenant + role escolhido (admin client = sem RLS).
  const { error: profileError } = await admin
    .from('profiles')
    .insert({
      id:        memberId,
      tenant_id: tenantId,
      role,
      full_name: full_name || null,
    })

  if (profileError) {
    // Rollback do utilizador para não deixar um auth.users órfão sem profile
    await admin.auth.admin.deleteUser(memberId)
    logger.error('Falha ao criar profile do membro — utilizador revertido', {
      email, erro: profileError.message,
    })
    return NextResponse.json({ error: 'Erro ao criar o perfil do membro.' }, { status: 500 })
  }

  // 7. Vincular o recurso (só staff). Confirma que o recurso é do tenant e está
  //    livre antes de ligar — evita roubar o recurso de outro tenant/membro.
  let resourceLinked = false
  if (role === 'staff' && resource_id) {
    const { data: linked, error: linkError } = await admin
      .from('resources')
      .update({ profile_id: memberId })
      .eq('id', resource_id)
      .eq('tenant_id', tenantId)
      .eq('type', 'staff')
      .is('profile_id', null)
      .select('id')

    if (linkError) {
      logger.warn('Membro criado mas falhou o vínculo ao recurso', { email, erro: linkError.message })
    } else {
      resourceLinked = (linked?.length ?? 0) > 0
    }
  }

  logger.info('Membro de equipa criado', { email, role, tenantId, resourceLinked })

  return NextResponse.json({ ok: true, email, role, resourceLinked }, { status: 201 })
}
