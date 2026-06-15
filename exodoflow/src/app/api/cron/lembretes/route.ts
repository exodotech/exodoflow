// GET /api/cron/lembretes — processa lembretes de TODOS os tenants ativos.
// Chamado por um agendador (Vercel Cron). NÃO tem sessão de utilizador, por isso
// autentica-se por CRON_SECRET e usa o admin client (server-only) para iterar.
//
// Segurança:
//   - exige header Authorization: Bearer ${CRON_SECRET} (o Vercel Cron envia-o
//     automaticamente quando CRON_SECRET está definido nas env vars do projeto);
//   - o admin client vive só no servidor (import 'server-only' em admin.ts);
//   - cada tenant é processado isoladamente (tenant_id explícito por chamada).
import { NextResponse }       from 'next/server'
import { createAdminClient }  from '@/lib/supabase/admin'
import { processarLembretes } from '@/services/lembretes'
import { logger }             from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET não configurado.' }, { status: 503 })
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: tenants, error } = await admin
    .from('tenants')
    .select('id')
    .is('deleted_at', null)
    .limit(5000)
  if (error) {
    logger.error('Cron lembretes: erro ao listar tenants', { erro: error.message })
    return NextResponse.json({ error: 'Erro ao listar tenants.' }, { status: 500 })
  }

  let enviados = 0
  let processados = 0
  const falhas: string[] = []

  for (const t of tenants ?? []) {
    try {
      const r = await processarLembretes(t.id)
      enviados += r.enviados
      processados += 1
      if (r.enviados > 0) {
        await admin.rpc('record_audit_log', {
          p_action:     'booking.lembretes',
          p_table_name: 'communication_logs',
          p_record_id:  undefined,
          p_metadata:   { enviados: r.enviados, ignorados: r.ignorados, mock: r.mock, via: 'cron' } as never,
        })
      }
    } catch (e) {
      // Uma falha num tenant não pode parar os restantes.
      falhas.push(t.id)
      logger.error('Cron lembretes: falha num tenant', { tenant: t.id, erro: e instanceof Error ? e.message : String(e) })
    }
  }

  logger.info('Cron lembretes concluído', { tenants: processados, enviados, falhas: falhas.length })
  return NextResponse.json({ ok: true, tenants: processados, enviados, falhas: falhas.length }, { status: 200 })
}
