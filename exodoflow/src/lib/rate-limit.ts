// Rate limiting — camada PREPARADA (readiness), não um limitador de produção.
//
// Implementação in-memory (janela fixa) adequada apenas a DEV / single-node:
// o estado vive no processo e não é partilhado entre instâncias. Em produção,
// substituir o store por um distribuído (Upstash Redis, tabela Supabase, ou
// Cloudflare) mantendo a mesma interface `checkRateLimit`.
//
// Uso típico num Route Handler:
//   const rl = checkRateLimit(`criar-empresa:${ip}`, { limit: 5, windowMs: 60_000 })
//   if (!rl.allowed) return NextResponse.json({ error: 'Demasiados pedidos' }, { status: 429, headers: rl.headers })

export interface RateLimitOptions {
  limit:    number   // nº máximo de pedidos na janela
  windowMs: number   // duração da janela em ms
}

export interface RateLimitResult {
  allowed:    boolean
  remaining:  number
  resetAt:    number              // epoch ms em que a janela reinicia
  headers:    Record<string, string>
}

interface Bucket { count: number; resetAt: number }

// Store em memória — NÃO usar em produção distribuída (estado por processo).
const store = new Map<string, Bucket>()

// Limpeza preguiçosa para o Map não crescer indefinidamente em dev.
function sweep(now: number) {
  if (store.size < 5000) return
  for (const [key, b] of store) {
    if (b.resetAt <= now) store.delete(key)
  }
}

export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  sweep(now)

  const existing = store.get(key)
  const bucket: Bucket =
    !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + opts.windowMs }
      : existing

  bucket.count += 1
  store.set(key, bucket)

  const remaining = Math.max(0, opts.limit - bucket.count)
  const allowed   = bucket.count <= opts.limit

  const headers: Record<string, string> = {
    'X-RateLimit-Limit':     String(opts.limit),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset':     String(Math.ceil(bucket.resetAt / 1000)),
  }
  if (!allowed) {
    headers['Retry-After'] = String(Math.ceil((bucket.resetAt - now) / 1000))
  }

  return { allowed, remaining, resetAt: bucket.resetAt, headers }
}

// Extrai um identificador de cliente do pedido (IP) para usar como chave.
// Atrás de proxy (Vercel/Cloudflare), o IP real vem em x-forwarded-for.
export function clientKeyFromRequest(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}
