// GET /api/cron/retencao — aplica a política de retenção (diário, via Vercel Cron).
// Conservador e opt-in: só apaga categorias transitórias e SÓ quando o tenant
// configura settings.retention.* (ver migração 0048). Autenticado por CRON_SECRET.
import { NextResponse }      from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger }           from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET não configurado.' }, { status: 503 })
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('aplicar_retencao')
  if (error) {
    logger.error('Cron retenção: erro', { erro: error.message })
    return NextResponse.json({ error: 'Erro ao aplicar retenção.' }, { status: 500 })
  }
  logger.info('Cron retenção concluído', { resumo: data })
  return NextResponse.json({ ok: true, resumo: data }, { status: 200 })
}
