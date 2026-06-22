// POST /api/relatorios/gerar — gera e loga um relatório financeiro (F3).
// Autenticado. Permissão: financas.manage (OWNER + MANAGER).
// O relatório é SEMPRE simulado nesta fase (sem provider de e-mail real).
// tenant_id vem SEMPRE da sessão (nunca do browser).
import { NextResponse }      from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { canAccess }         from '@/lib/permissions'
import { checkRateLimit, clientKeyFromRequest } from '@/lib/rate-limit'
import { gerarEEnviarRelatorio } from '@/services/relatorios'
import { logger }            from '@/lib/logger'
import type { AppRole }      from '@/types/domain/permission'
import type { RelatorioTipo } from '@/types/domain/relatorios'

const TIPOS_VALIDOS: RelatorioTipo[] = ['relatorio_diario', 'relatorio_mensal']

export async function POST(request: Request) {
  // Rate-limit (evita spam de trigger manual)
  const rl = checkRateLimit(`relatorio:${clientKeyFromRequest(request)}`, { limit: 20, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Demasiados pedidos.' }, { status: 429, headers: rl.headers })

  // 1. Autenticação
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  // 2. Role + tenant da BD (NUNCA do browser)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, tenant_id')
    .eq('id', user.id)
    .single()
  if (!profile?.tenant_id) return NextResponse.json({ error: 'Tenant não identificado.' }, { status: 400 })
  if (!canAccess(profile.role as AppRole, 'financas.manage')) {
    return NextResponse.json({ error: 'Sem permissão para gerar relatórios financeiros.' }, { status: 403 })
  }

  // 3. Validar payload
  let body: { tipo?: string; periodo?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 }) }

  const tipo = body.tipo as RelatorioTipo | undefined
  if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
    return NextResponse.json({ error: 'Tipo de relatório inválido. Use relatorio_diario ou relatorio_mensal.' }, { status: 400 })
  }
  const periodo = typeof body.periodo === 'string' ? body.periodo : undefined

  // 4. Gerar + logar
  try {
    const resultado = await gerarEEnviarRelatorio({
      tenant_id: profile.tenant_id,
      tipo,
      periodo,
      actor_id:  user.id,
    })

    // Auditoria
    await supabase.rpc('record_audit_log', {
      p_action:      'finance.gerar_relatorio',
      p_table_name:  'communication_logs',
      p_record_id:   resultado.log_id,
      p_metadata:    { tipo, periodo: resultado.relatorio.periodo },
    })

    return NextResponse.json({
      ok:        true,
      log_id:    resultado.log_id,
      assunto:   resultado.relatorio.assunto,
      periodo:   resultado.relatorio.periodo,
      resumo:    resultado.relatorio.resumo,
      destinario: resultado.destinario,
      mock:      process.env.RELATORIO_MOCK !== 'false',
    }, { status: 201 })
  } catch (e) {
    logger.error('Erro ao gerar relatório financeiro', { erro: e instanceof Error ? e.message : String(e) })
    return NextResponse.json({ error: 'Erro ao gerar relatório.' }, { status: 500 })
  }
}
