// Camada de observabilidade — ponto ÚNICO de reporte de erros e eventos.
// Vendor-agnóstica: hoje regista de forma estruturada via logger; quando houver
// NEXT_PUBLIC_SENTRY_DSN, o envio para Sentry é uma troca isolada em flushToSink().
//
// Porque assim: o bug do logo (next/image) só apareceu em runtime no browser do
// utilizador. Um sink de observabilidade captura esses erros em produção, com
// contexto (rota, utilizador, tenant), sem espalhar try/catch pelo código.
import { logger } from '@/lib/logger'

export interface ErrorContext {
  // Onde ocorreu (ex: 'route:/dashboard', 'api:/api/health', 'boundary:global')
  scope?:    string
  // Identificador de correlação do Next (error.digest) quando existir
  digest?:   string
  // Contexto livre adicional (sem dados pessoais sensíveis)
  extra?:    Record<string, unknown>
}

// Normaliza qualquer valor lançado num formato estável
function normalizar(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack }
  }
  return { name: 'NonError', message: String(error) }
}

// Único ponto de saída — trocar por Sentry.captureException aqui quando o DSN existir.
// Sentry está configurado? (DSN presente). A app NUNCA depende disto para
// funcionar — sem DSN, o sink continua a registar via logger, sem crashar.
export function isSentryConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_SENTRY_DSN
}

function flushToSink(level: 'error' | 'warn' | 'info', payload: Record<string, unknown>): void {
  // Quando NEXT_PUBLIC_SENTRY_DSN existir e o SDK estiver instalado, encaminhar
  // aqui para Sentry.captureException/captureMessage. Sem DSN, regista via logger
  // (a app nunca quebra por falta de Sentry — requisito de readiness).
  logger[level](`[observability] ${String(payload.message ?? 'evento')}`, payload)
}

// Reporta um erro com contexto. Usar nas error boundaries e em catch de topo.
export function reportError(error: unknown, context: ErrorContext = {}): void {
  const { name, message, stack } = normalizar(error)
  flushToSink('error', {
    name, message, stack,
    scope:  context.scope,
    digest: context.digest,
    ...(context.extra ?? {}),
  })
}

// Reporta um evento/aviso operacional (não é uma excepção).
export function reportMessage(
  message: string,
  level: 'warn' | 'info' = 'info',
  extra?: Record<string, unknown>,
): void {
  flushToSink(level, { message, ...(extra ?? {}) })
}
