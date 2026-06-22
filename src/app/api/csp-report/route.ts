// POST /api/csp-report — recebe relatórios de violação de Content-Security-Policy.
// O CSP está em modo Report-Only (next.config.ts) com `report-uri` a apontar aqui.
// Objetivo: RECOLHER violações em produção para, mais tarde, mudar para enforce
// com confiança (sem partir a app). Não bloqueia nada — só regista.
//
// O browser envia POST com content-type 'application/csp-report' e corpo
// { "csp-report": { ... } } (legacy report-uri) ou um array (report-to). Aceita
// ambos. Rate-limited para não ser inundado.
import { NextResponse } from 'next/server'
import { checkRateLimit, clientKeyFromRequest } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

interface CspReport {
  'document-uri'?:        string
  'violated-directive'?:  string
  'effective-directive'?: string
  'blocked-uri'?:         string
}

export async function POST(request: Request) {
  // Limite generoso por IP — um browser pode reportar várias violações.
  const rl = checkRateLimit(`csp-report:${clientKeyFromRequest(request)}`, { limit: 60, windowMs: 60_000 })
  if (!rl.allowed) return new NextResponse(null, { status: 429, headers: rl.headers })

  let payload: unknown
  try { payload = await request.json() } catch { return new NextResponse(null, { status: 204 }) }

  // Normaliza os dois formatos possíveis para uma lista de relatórios.
  const reports: CspReport[] = Array.isArray(payload)
    ? (payload as Array<{ body?: CspReport }>).map((r) => r.body ?? (r as CspReport))
    : [((payload as { 'csp-report'?: CspReport })['csp-report']) ?? (payload as CspReport)]

  for (const r of reports) {
    if (!r) continue
    logger.security('Violação de CSP (Report-Only)', {
      action:    'csp.violation',
      directive: r['effective-directive'] ?? r['violated-directive'],
      blocked:   r['blocked-uri'],
      documento: r['document-uri'],
    })
  }

  // 204: o browser não espera corpo nas notificações de relatório.
  return new NextResponse(null, { status: 204 })
}
