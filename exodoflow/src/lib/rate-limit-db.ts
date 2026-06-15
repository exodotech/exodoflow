// Rate limit DISTRIBUÍDO — SERVER-SIDE apenas. Partilha o contador entre
// instâncias serverless via a RPC atómica rl_hit (migração 0043), ao contrário
// do limitador in-memory que só protege um processo.
//
// Resiliência: se o store distribuído falhar (BD indisponível), NÃO abre o
// portão — cai para o limitador in-memory (degradado, mas continua a proteger a
// instância). Mantém a mesma interface RateLimitResult.
import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit, type RateLimitOptions, type RateLimitResult } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export async function checkRateLimitDb(key: string, opts: RateLimitOptions): Promise<RateLimitResult> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('rl_hit', {
      p_key:            key,
      p_limit:          opts.limit,
      p_window_seconds: Math.ceil(opts.windowMs / 1000),
    })
    const row = Array.isArray(data) ? data[0] : data
    if (error || !row) throw error ?? new Error('rl_hit não devolveu dados')

    const resetAt = new Date(row.reset_at as string).getTime()
    const headers: Record<string, string> = {
      'X-RateLimit-Limit':     String(opts.limit),
      'X-RateLimit-Remaining': String(row.remaining),
      'X-RateLimit-Reset':     String(Math.ceil(resetAt / 1000)),
    }
    if (!row.allowed) {
      headers['Retry-After'] = String(Math.max(0, Math.ceil((resetAt - Date.now()) / 1000)))
    }
    return { allowed: row.allowed as boolean, remaining: row.remaining as number, resetAt, headers }
  } catch (e) {
    logger.warn('rate-limit distribuído indisponível; fallback in-memory', {
      erro: e instanceof Error ? e.message : String(e),
    })
    return checkRateLimit(key, opts)
  }
}
