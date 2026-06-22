// POST /api/admin/criar-empresa — cria o OWNER inicial de uma nova empresa.
// SOMENTE SUPERADMIN. O trigger on_auth_user_created provisiona o tenant + profile.
//
// Fluxo de segurança (defesa em camadas):
//   1. Sessão válida (cookie) — senão 401
//   2. Role do utilizador autenticado === 'superadmin' (lido da BD) — senão 403
//   3. Só depois usa a service_role para criar o utilizador
// A service_role NUNCA chega ao cliente: vive apenas neste handler server-side.
import { NextResponse }      from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { criarEmpresaSchema } from '@/lib/validators/admin'
import { checkRateLimit, clientKeyFromRequest } from '@/lib/rate-limit'
import { semearComunicacaoTenant } from '@/services/comunicacao-seed'
import { deriveMarketSettings } from '@/lib/i18n/market'
import { logger }            from '@/lib/logger'

export async function POST(request: Request) {
  // 0. Rate limit (readiness — in-memory em dev; trocar por store distribuído em prod)
  const rl = checkRateLimit(`criar-empresa:${clientKeyFromRequest(request)}`, { limit: 10, windowMs: 60_000 })
  if (!rl.allowed) {
    logger.security('Rate limit excedido em criar-empresa', { action: 'admin.criar_empresa' })
    return NextResponse.json({ error: 'Demasiados pedidos. Tente novamente daqui a pouco.' }, { status: 429, headers: rl.headers })
  }

  // 1. Autenticação
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // 2. Autorização — confirmar role na BD (nunca confiar no cliente)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  // 3. Validar payload
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo do pedido inválido' }, { status: 400 })
  }

  const parsed = criarEmpresaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const { email, password, full_name, country, business_type } = parsed.data

  // País → locale/moeda/fuso (definidos AGORA, na criação). Fonte única: market.ts
  const mercado = deriveMarketSettings(country)

  // 4. Criar o utilizador via admin API (service_role)
  const admin = createAdminClient()
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,   // sem confirmação por e-mail no fluxo administrativo
    user_metadata: full_name ? { full_name } : undefined,
  })

  if (error) {
    // E-mail já existente é o erro mais comum — mensagem clara, sem detalhes internos
    const msg = error.message.toLowerCase().includes('already')
      ? 'Já existe uma conta com este e-mail.'
      : 'Não foi possível criar a empresa. Verifique os dados e tente novamente.'
    logger.warn('Falha ao criar empresa pelo admin', { email, erro: error.message })
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // O trigger criou o tenant + profile owner. Definir país/nicho + settings
  // derivados (o owner já não os escolhe). onboarding_completed=false → permitido.
  const newUserId = created.user?.id
  let tenantSlug: string | null = null
  let createdTenantId: string | null = null
  if (newUserId) {
    const { data: prof } = await admin
      .from('profiles')
      .select('tenant_id')
      .eq('id', newUserId)
      .single()
    if (prof?.tenant_id) {
      createdTenantId = prof.tenant_id
      const { data: tenant } = await admin
        .from('tenants')
        .select('slug, settings')
        .eq('id', prof.tenant_id)
        .single()
      tenantSlug = tenant?.slug ?? null

      const settingsAtuais = (tenant?.settings ?? {}) as Record<string, unknown>
      await admin
        .from('tenants')
        .update({
          country,
          business_type,
          settings: {
            ...settingsAtuais,
            timezone: mercado.timezone,
            currency: mercado.currency,
            locale:   mercado.locale,
            slot_interval_minutes: (settingsAtuais.slot_interval_minutes as number | undefined) ?? 15,
          },
        })
        .eq('id', prof.tenant_id)

      // Semear canais (inactivos) + templates WhatsApp no locale do país.
      // Best-effort: nunca bloqueia a criação da empresa.
      try {
        await semearComunicacaoTenant(admin, prof.tenant_id, mercado.locale)
      } catch (e) {
        logger.warn('Falha ao semear comunicação do tenant', { tenantId: prof.tenant_id, erro: e instanceof Error ? e.message : String(e) })
      }
    }
  }

  logger.info('Empresa criada pelo superadmin', { email, userId: newUserId, country, business_type })

  // Auditoria de sistema (criação de tenant + owner inicial). Usa a sessão do
  // superadmin (não a service_role) — o RPC é gated por auth_user_role()='superadmin'.
  // Não bloqueia a resposta se a auditoria falhar.
  try {
    await supabase.rpc('record_system_audit_log', {
      p_action:          'tenant.create',
      p_entity_type:     'tenant',
      p_target_tenant_id: createdTenantId ?? undefined,
      p_description:     `Criou a empresa e o owner inicial (${country} · ${business_type})`,
      p_metadata:        { country, business_type, owner_email: email },
    })
  } catch { /* auditoria nunca bloqueia a criação */ }

  return NextResponse.json(
    { ok: true, email, tenantSlug },
    { status: 201 }
  )
}
