// Assistente virtual — SERVER-SIDE. Constrói o contexto do tenant e gera a
// resposta. Hoje usa o responder heurístico (mock); quando ANTHROPIC_API_KEY
// estiver definida, o mesmo contexto alimenta a IA (Claude) — ver o seam abaixo.
// REGRA do projeto: IA é só camada de conversa, NUNCA escreve na agenda.
import { createAdminClient } from '@/lib/supabase/admin'
import { gerarRespostaAssistente, type ContextoAssistente } from '@/lib/assistant/responder'

export interface RespostaAssistente {
  reply: string
  mode:  'mock' | 'ai'
}

async function construirContexto(tenant_id: string): Promise<ContextoAssistente> {
  const admin = createAdminClient()
  const { data: t } = await admin
    .from('tenants').select('name, slug, phone, settings').eq('id', tenant_id).single()
  const { data: servicos } = await admin
    .from('services').select('name, price').eq('tenant_id', tenant_id).eq('is_active', true).is('deleted_at', null).order('sort_order')

  const settings = (t?.settings ?? {}) as {
    currency?: string
    address?: { street?: string; city?: string }
    google_maps_url?: string
  }
  const addr = settings.address
  const morada = addr?.street ? [addr.street, addr.city].filter(Boolean).join(', ') : (settings.google_maps_url ?? null)

  const base = process.env.NEXT_PUBLIC_APP_URL
  const portalUrl = base && t?.slug ? `${base}/marcar/${t.slug}` : null

  return {
    nome:      t?.name ?? 'a nossa clínica',
    servicos:  (servicos ?? []).map((s) => ({ name: s.name, price: s.price })),
    portalUrl,
    morada,
    telefone:  t?.phone ?? null,
    moeda:     settings.currency ?? 'EUR',
  }
}

// Gera a resposta do assistente para uma mensagem do cliente.
export async function responderAssistente(tenant_id: string, mensagem: string): Promise<RespostaAssistente> {
  const ctx = await construirContexto(tenant_id)

  const temChaveIA = !!process.env.ANTHROPIC_API_KEY
  const forcarMock = process.env.ASSISTANT_MOCK === 'true'

  // ── SEAM da IA real ────────────────────────────────────────────────────────
  // Quando houver chave (e não forçar mock), aqui chamaríamos o Claude com um
  // system prompt construído a partir de `ctx` (nome, serviços, preços, morada,
  // portalUrl) e a instrução de NUNCA marcar — só informar e direcionar.
  // Mantém-se o responder heurístico como fallback determinístico.
  if (temChaveIA && !forcarMock) {
    // TODO: integrar @anthropic-ai/sdk usando `ctx` como contexto.
    // Por agora, ainda sem SDK instalado, recorre ao responder determinístico.
    return { reply: gerarRespostaAssistente(mensagem, ctx), mode: 'ai' }
  }

  return { reply: gerarRespostaAssistente(mensagem, ctx), mode: 'mock' }
}
