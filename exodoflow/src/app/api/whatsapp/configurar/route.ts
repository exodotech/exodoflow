// POST /api/whatsapp/configurar — liga/desliga o canal WhatsApp (Meta Cloud API).
// Owner-only. O access_token (segredo) é recebido aqui e guardado em
// communication_channels.config SÓ server-side (nunca volta ao browser).
//   body { phone_number, phone_number_id, access_token }  → ligar
//   body { disconnect: true }                              → desligar (limpa token)
import { NextResponse }      from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit, clientKeyFromRequest } from '@/lib/rate-limit'
import { encryptSecret }     from '@/lib/crypto/secret'
import { logger }            from '@/lib/logger'

export async function POST(request: Request) {
  const rl = checkRateLimit(`wa-config:${clientKeyFromRequest(request)}`, { limit: 10, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Demasiados pedidos.' }, { status: 429, headers: rl.headers })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, tenant_id').eq('id', user.id).single()
  if (!profile?.tenant_id) return NextResponse.json({ error: 'Tenant não identificado.' }, { status: 400 })
  if (profile.role !== 'owner') {
    return NextResponse.json({ error: 'Apenas o proprietário pode configurar o WhatsApp.' }, { status: 403 })
  }

  let body: { phone_number?: string; phone_number_id?: string; access_token?: string; disconnect?: boolean }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 }) }

  const admin = createAdminClient()

  // ── Desligar: desativa e REMOVE o token (mantém o número para histórico) ─────
  if (body.disconnect) {
    const { data: cur } = await admin.from('communication_channels')
      .select('config').eq('tenant_id', profile.tenant_id).eq('channel', 'whatsapp').maybeSingle()
    const numero = ((cur?.config ?? {}) as { phone_number?: string }).phone_number ?? null
    const { error } = await admin.from('communication_channels')
      .update({ is_active: false, config: numero ? { phone_number: numero } : {} })
      .eq('tenant_id', profile.tenant_id).eq('channel', 'whatsapp')
    if (error) return NextResponse.json({ error: 'Erro ao desligar.' }, { status: 500 })
    await supabase.rpc('record_audit_log', { p_action: 'whatsapp.disconnect', p_table_name: 'communication_channels', p_record_id: undefined, p_metadata: {} as never })
    logger.info('WhatsApp desligado', { tenant: profile.tenant_id })
    return NextResponse.json({ ok: true, is_active: false }, { status: 200 })
  }

  // ── Ligar: valida e guarda as credenciais ────────────────────────────────────
  const phone_number_id = (body.phone_number_id ?? '').trim()
  const access_token    = (body.access_token ?? '').trim()
  const phone_number    = (body.phone_number ?? '').trim()
  if (!phone_number_id || !access_token) {
    return NextResponse.json({ error: 'Phone Number ID e Access Token são obrigatórios.' }, { status: 400 })
  }

  // O access_token é encriptado em repouso (AES-256-GCM). O phone_number_id NÃO é
  // segredo (é usado no lookup do webhook) e fica em claro.
  const { error } = await admin.from('communication_channels').upsert({
    tenant_id: profile.tenant_id,
    channel:   'whatsapp',
    is_active: true,
    config:    { phone_number, phone_number_id, access_token: encryptSecret(access_token) },
  }, { onConflict: 'tenant_id,channel' })
  if (error) {
    logger.error('Erro ao guardar canal WhatsApp', { erro: error.message })
    return NextResponse.json({ error: 'Erro ao guardar a configuração.' }, { status: 500 })
  }
  await supabase.rpc('record_audit_log', { p_action: 'whatsapp.connect', p_table_name: 'communication_channels', p_record_id: undefined, p_metadata: { phone_number } as never })
  logger.info('WhatsApp ligado', { tenant: profile.tenant_id })
  return NextResponse.json({ ok: true, is_active: true }, { status: 200 })
}
