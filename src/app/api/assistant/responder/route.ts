// POST /api/assistant/responder — gera a resposta do assistente virtual para uma
// mensagem de cliente. Autenticado (membro do tenant). tenant_id vem da sessão.
// Usado pelo "testar assistente" e, futuramente, pelo webhook do WhatsApp.
import { NextResponse }      from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { checkRateLimit, clientKeyFromRequest } from '@/lib/rate-limit'
import { responderAssistente } from '@/services/assistant'

export async function POST(req: Request) {
  const rl = checkRateLimit(`assistant:${clientKeyFromRequest(req)}`, { limit: 30, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Demasiados pedidos.' }, { status: 429, headers: rl.headers })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  if (!profile?.tenant_id) return NextResponse.json({ error: 'Tenant não identificado.' }, { status: 400 })

  let body: { message?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 }) }
  const message = (body.message ?? '').trim()
  if (!message) return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 })

  try {
    const r = await responderAssistente(profile.tenant_id, message.slice(0, 500))
    return NextResponse.json(r)
  } catch {
    return NextResponse.json({ error: 'Erro ao gerar resposta.' }, { status: 500 })
  }
}
