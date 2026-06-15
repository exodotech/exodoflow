// Assistente virtual — responder HEURÍSTICO (mock, sem IA). Funções PURAS.
// Deteta a intenção da mensagem do cliente e responde com os dados do tenant.
// REGRA: o assistente NUNCA marca sozinho — só informa e direciona (portal/equipa).
// Quando houver chave de IA, este responder é o fallback; a IA usa o mesmo contexto.

export interface ContextoAssistente {
  nome:       string                    // nome da empresa
  servicos:   { name: string; price?: number | null }[]
  portalUrl?: string | null             // link do portal de marcações
  morada?:    string | null
  telefone?:  string | null
  moeda?:     string                    // símbolo/código (ex: EUR)
}

export type Intencao = 'saudacao' | 'servicos' | 'precos' | 'horario' | 'morada' | 'marcacao' | 'agradecimento' | 'desconhecida'

const PALAVRAS: Record<Exclude<Intencao, 'desconhecida'>, string[]> = {
  saudacao:      ['ola', 'olá', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'hey'],
  marcacao:      ['marcar', 'marcacao', 'marcação', 'agendar', 'agendamento', 'reservar', 'marco', 'vaga'],
  precos:        ['preco', 'preço', 'precos', 'preços', 'custa', 'valor', 'quanto'],
  servicos:      ['servico', 'serviço', 'servicos', 'serviços', 'tratamento', 'oferecem', 'fazem', 'fazes'],
  horario:       ['horario', 'horário', 'horas', 'aberto', 'abertos', 'funciona', 'abrem', 'fecham'],
  morada:        ['morada', 'onde', 'localiz', 'endereco', 'endereço', 'fica', 'sitio', 'sítio', 'maps'],
  agradecimento: ['obrigado', 'obrigada', 'obg', 'valeu', 'thanks'],
}

function normalizar(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Deteta a intenção a partir de palavras-chave (ordem = prioridade).
export function detetarIntencao(mensagem: string): Intencao {
  const m = normalizar(mensagem)
  const ordem: Exclude<Intencao, 'desconhecida'>[] = ['marcacao', 'precos', 'servicos', 'horario', 'morada', 'agradecimento', 'saudacao']
  for (const intent of ordem) {
    if (PALAVRAS[intent].some((p) => m.includes(normalizar(p)))) return intent
  }
  return 'desconhecida'
}

function listaServicos(ctx: ContextoAssistente, comPreco: boolean): string {
  if (ctx.servicos.length === 0) return 'Consulte os nossos serviços no portal.'
  const moeda = ctx.moeda === 'BRL' ? 'R$' : '€'
  return ctx.servicos.slice(0, 8).map((s) =>
    comPreco && s.price != null ? `• ${s.name} — ${moeda}${Number(s.price).toFixed(2)}` : `• ${s.name}`,
  ).join('\n')
}

// Gera a resposta do assistente (texto). Sempre simpática e sempre com saída
// para falar com a equipa; para marcar, direciona para o portal (nunca marca).
export function gerarRespostaAssistente(mensagem: string, ctx: ContextoAssistente): string {
  const intent = detetarIntencao(mensagem)
  const portal = ctx.portalUrl ? `\n\nPode marcar online aqui: ${ctx.portalUrl}` : ''

  switch (intent) {
    case 'saudacao':
      return `Olá! 👋 Bem-vindo(a) à ${ctx.nome}. Posso ajudar com serviços, preços, horários, morada ou marcações. Como posso ajudar?`
    case 'servicos':
      return `Os nossos serviços:\n${listaServicos(ctx, false)}${portal}`
    case 'precos':
      return `Tabela de preços:\n${listaServicos(ctx, true)}${portal}`
    case 'horario':
      return `Os horários disponíveis aparecem no nosso portal de marcações.${portal || ' Contacte-nos para mais informações.'}`
    case 'morada':
      return ctx.morada
        ? `Estamos em: ${ctx.morada}.${ctx.telefone ? ` Telefone: ${ctx.telefone}.` : ''}`
        : `Para a nossa localização, contacte-nos${ctx.telefone ? ` pelo ${ctx.telefone}` : ''}.`
    case 'marcacao':
      return `Com certeza! 🗓️ Pode marcar você mesmo, escolhendo serviço, dia e hora.${portal || ' A nossa equipa vai ajudá-lo(a) a marcar em breve.'}\n\nSe preferir, deixe a sua mensagem que respondemos.`
    case 'agradecimento':
      return 'De nada! 😊 Estamos aqui para ajudar. Até breve!'
    default:
      return `Obrigado pela sua mensagem! 🌿 Posso ajudar com **serviços**, **preços**, **horários**, **morada** ou **marcações**. Para algo específico, a nossa equipa responde em breve.${portal}`
  }
}
