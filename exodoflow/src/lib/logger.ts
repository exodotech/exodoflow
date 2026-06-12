// Logger central da aplicação.
// Envolve console.* com prefixo, timestamp e contexto estruturado. Preparado para
// integrar um serviço externo (Sentry, Axiom, etc.) num único ponto no futuro:
// basta encaminhar em forwardToSink().
//
// Níveis: info | warn | error (operacionais) + audit (acções de negócio) +
// security (eventos de segurança: acesso negado, escalada, RLS).
//
// PRIVACIDADE: nunca registar passwords, tokens, service_role ou dados sensíveis
// em claro. Usar maskPII() para telefone/e-mail/NIF quando precisarem de aparecer.

type LogLevel = 'info' | 'warn' | 'error' | 'audit' | 'security'

export interface LogContext {
  tenant_id?: string | null
  user_id?:   string | null
  role?:      string | null
  action?:    string
  entity?:    string
  entity_id?: string | null
  metadata?:  Record<string, unknown>
  [key: string]: unknown
}

// Mascara dados pessoais para aparecerem em logs sem expor o valor completo.
// Ex.: "351912345678" → "3514***678"; "ana@mail.pt" → "a***@mail.pt".
export function maskPII(value: string | null | undefined): string {
  if (!value) return ''
  const v = String(value)
  if (v.includes('@')) {
    const [user, domain] = v.split('@')
    const head = user.slice(0, 1)
    return `${head}***@${domain}`
  }
  if (v.length <= 4) return '***'
  return `${v.slice(0, 4)}***${v.slice(-3)}`
}

// Ponto único de saída — futuro encaminhamento para Sentry/Axiom vive aqui.
function forwardToSink(level: LogLevel, message: string, context?: LogContext) {
  // Placeholder: integração com Sentry é feita na config de Sentry/instrumentation.
  // Mantido desacoplado para não prender o logger a um SDK específico.
  void level; void message; void context
}

function log(level: LogLevel, message: string, context?: LogContext) {
  const timestamp = new Date().toISOString()
  const tag = level.toUpperCase()
  const entry = context
    ? `[${timestamp}] [${tag}] ${message} ${JSON.stringify(context)}`
    : `[${timestamp}] [${tag}] ${message}`

  switch (level) {
    case 'info':     console.info(entry);  break
    case 'warn':     console.warn(entry);  break
    case 'error':    console.error(entry); break
    case 'audit':    console.info(entry);  break   // acção de negócio
    case 'security': console.warn(entry);  break   // evento de segurança
  }
  forwardToSink(level, message, context)
}

export const logger = {
  info:     (message: string, context?: LogContext) => log('info',     message, context),
  warn:     (message: string, context?: LogContext) => log('warn',     message, context),
  error:    (message: string, context?: LogContext) => log('error',    message, context),
  // Acção de negócio relevante (criar/editar/apagar, marcações, equipa, empresa).
  audit:    (message: string, context?: LogContext) => log('audit',    message, context),
  // Evento de segurança (acesso negado, tentativa sem permissão, RLS, escalada).
  security: (message: string, context?: LogContext) => log('security', message, context),
}
