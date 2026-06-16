// Assistente virtual — SERVER-SIDE. Constrói o contexto do tenant e gera a
// resposta. Com ANTHROPIC_API_KEY (e ASSISTANT_MOCK≠true) chama o Claude real
// (Anthropic Messages API via fetch); sem chave, ou em caso de falha, usa o
// responder heurístico determinístico como fallback (nunca quebra).
// REGRA do projeto: IA é só camada de conversa, NUNCA escreve na agenda.
import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { gerarRespostaAssistente, type ContextoAssistente } from '@/lib/assistant/responder'
import { formatCurrencyByCode } from '@/lib/i18n/currency'
import { logger } from '@/lib/logger'

// Modelo de chat: Haiku é rápido/barato e suficiente para auto-resposta.
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001'

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

// System prompt: dá o contexto da clínica e impõe a fronteira (nunca marca).
function construirSystemPrompt(ctx: ContextoAssistente): string {
  const servicos = ctx.servicos.length
    ? ctx.servicos.map((s) => `- ${s.name}${s.price != null ? ` (${formatCurrencyByCode(s.price, ctx.moeda ?? 'EUR', 'pt-PT')})` : ''}`).join('\n')
    : '- (lista de serviços indisponível)'
  return [
    `És o assistente virtual de "${ctx.nome}". Respondes a clientes por mensagem, em português, de forma simpática, breve e clara.`,
    '',
    'Informação da clínica (usa SÓ isto; não inventes):',
    `Serviços e preços:\n${servicos}`,
    `Morada: ${ctx.morada ?? 'não disponível'}`,
    `Telefone: ${ctx.telefone ?? 'não disponível'}`,
    `Portal de marcações: ${ctx.portalUrl ?? 'não disponível'}`,
    '',
    'REGRAS OBRIGATÓRIAS:',
    '- NUNCA marcas, alteras ou cancelas marcações. Não tens acesso à agenda.',
    `- Para marcar/alterar, direciona SEMPRE para o portal${ctx.portalUrl ? ` (${ctx.portalUrl})` : ''} ou para a equipa${ctx.telefone ? ` (${ctx.telefone})` : ''}.`,
    '- Não inventes serviços, preços, horários nem disponibilidade.',
    '- Se não souberes, sugere falar com a equipa.',
    '- Responde em 1 a 3 frases. Sem markdown.',
  ].join('\n')
}

// Chama o Claude real (Anthropic Messages API). Devolve null em qualquer falha,
// para o chamador cair no responder heurístico (auto-resposta nunca quebra).
async function gerarRespostaIA(ctx: ContextoAssistente, mensagem: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         process.env.ANTHROPIC_API_KEY as string,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 400,
        system: construirSystemPrompt(ctx),
        messages: [{ role: 'user', content: mensagem }],
      }),
    })
    if (!res.ok) {
      logger.warn('Assistente IA: resposta não-ok', { status: res.status })
      return null
    }
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> }
    const texto = data.content?.find((c) => c.type === 'text')?.text?.trim()
    return texto && texto.length > 0 ? texto : null
  } catch (e) {
    logger.warn('Assistente IA: exceção', { erro: e instanceof Error ? e.message : String(e) })
    return null
  }
}

// Gera a resposta do assistente para uma mensagem do cliente.
export async function responderAssistente(tenant_id: string, mensagem: string): Promise<RespostaAssistente> {
  const ctx = await construirContexto(tenant_id)

  const temChaveIA = !!process.env.ANTHROPIC_API_KEY
  const forcarMock = process.env.ASSISTANT_MOCK === 'true'

  // IA real quando há chave e não está forçado o mock; fallback heurístico se falhar.
  if (temChaveIA && !forcarMock) {
    const reply = await gerarRespostaIA(ctx, mensagem)
    if (reply) return { reply, mode: 'ai' }
    // falhou → fallback determinístico (não quebra a auto-resposta)
    return { reply: gerarRespostaAssistente(mensagem, ctx), mode: 'mock' }
  }

  return { reply: gerarRespostaAssistente(mensagem, ctx), mode: 'mock' }
}
