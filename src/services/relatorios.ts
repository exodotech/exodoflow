// Serviço de Relatórios Financeiros (F3) — SERVER-SIDE apenas.
// Gera e "envia" (mock) resumos diários/mensais de caixa.
// O envio REAL de e-mail não existe nesta fase — apenas log em communication_logs.
// Segurança: tenant_id vem sempre da sessão (nunca do browser).
import { createAdminClient } from '@/lib/supabase/admin'
import { gerarRelatorioDiario, gerarRelatorioMensal } from '@/lib/relatorios/gerador'
import { logger } from '@/lib/logger'
import type { FinancialTransaction } from '@/types/domain/financas'
import type { RelatorioGerado, RelatorioLog, RelatorioTipo } from '@/types/domain/relatorios'
import type { SupportedLocale } from '@/types/domain/communication'

export interface GerarRelatorioInput {
  tenant_id:   string
  tipo:        RelatorioTipo
  // 'YYYY-MM-DD' para diário, 'YYYY-MM' para mensal.
  // Se omitido, usa hoje/mês actual (em UTC).
  periodo?:    string
  actor_id?:   string           // utilizador que disparou manualmente
}

export interface GerarRelatorioResult {
  relatorio:  RelatorioGerado
  log_id:     string
  destinario: string
}

// Gera e loga um relatório financeiro.
// Sempre simulado (RELATORIO_MOCK=true por omissão até integração real).
export async function gerarEEnviarRelatorio(
  input: GerarRelatorioInput,
): Promise<GerarRelatorioResult> {
  const admin = createAdminClient()
  const isMock = process.env.RELATORIO_MOCK !== 'false'

  // 1. Carregar dados do tenant (nome, moeda, locale, configurações de relatório)
  const { data: tenant, error: tenantErr } = await admin
    .from('tenants')
    .select('name, settings')
    .eq('id', input.tenant_id)
    .single()
  if (tenantErr || !tenant) throw new Error('Tenant não encontrado.')

  const settings  = (tenant.settings ?? {}) as {
    currency?: string; locale?: SupportedLocale; timezone?: string;
    relatorio?: { email_destino?: string }
  }
  const currency   = settings.currency   ?? 'EUR'
  const locale     = (settings.locale    ?? 'pt-PT') as SupportedLocale
  const timezone   = settings.timezone   ?? 'Europe/Lisbon'
  const destinario = settings.relatorio?.email_destino ?? 'nao-configurado@exemplo.pt'

  // 2. Calcular o período (hoje ou mês actual no fuso do tenant)
  const agora   = new Date()
  const hojeISO = agora.toLocaleDateString('en-CA', { timeZone: timezone })
  const mesISO  = hojeISO.slice(0, 7)

  const periodo = input.periodo ?? (input.tipo === 'relatorio_diario' ? hojeISO : mesISO)
  const from    = input.tipo === 'relatorio_diario' ? periodo : `${periodo}-01`
  const to      = input.tipo === 'relatorio_diario' ? periodo : `${periodo}-31`

  // 3. Buscar transações do período (admin ignora RLS — corre no servidor)
  const { data: txs, error: txErr } = await admin
    .from('financial_transactions')
    .select('id,tenant_id,type,category,description,amount,currency,payment_method,transaction_date,booking_id,client_id,created_by,created_at,updated_at,deleted_at')
    .eq('tenant_id', input.tenant_id)
    .is('deleted_at', null)
    .gte('transaction_date', from)
    .lte('transaction_date', to)
    .order('transaction_date', { ascending: true })
  if (txErr) throw new Error(`Erro ao buscar transações: ${txErr.message}`)

  // 4. Gerar o corpo do relatório (função pura — sem I/O)
  const relatorio = input.tipo === 'relatorio_diario'
    ? gerarRelatorioDiario(
        (txs ?? []) as FinancialTransaction[], periodo, currency, locale, tenant.name ?? undefined,
      )
    : gerarRelatorioMensal(
        (txs ?? []) as FinancialTransaction[], periodo, currency, locale, tenant.name ?? undefined,
      )

  // 5. Log em communication_logs (simulado ou real no futuro)
  const status = isMock ? 'simulated' : 'sent'
  const { data: log, error: logErr } = await admin
    .from('communication_logs')
    .insert({
      tenant_id:   input.tenant_id,
      booking_id:  null,
      client_id:   null,
      channel:     'email',
      event_type:  input.tipo,
      template_id: null,
      recipient:   destinario,
      body:        relatorio.corpo,
      status,
      sent_at:     isMock ? null : new Date().toISOString(),
    })
    .select('id')
    .single()
  if (logErr) throw new Error(`Erro ao guardar log: ${logErr.message}`)

  if (isMock) {
    logger.info('[RELATORIO MOCK] Relatório gerado e logado sem envio real.', {
      tenant_id: input.tenant_id, tipo: input.tipo, periodo,
    })
  }

  return { relatorio, log_id: log.id, destinario }
}

// Lista os logs de relatório (diário + mensal) do tenant.
export async function listarLogsRelatorio(
  tenant_id: string,
  limit = 30,
): Promise<RelatorioLog[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('communication_logs')
    .select('id,tenant_id,event_type,recipient,body,status,created_at')
    .eq('tenant_id', tenant_id)
    .in('event_type', ['relatorio_diario', 'relatorio_mensal'])
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`Erro ao listar logs: ${error.message}`)
  return (data ?? []) as RelatorioLog[]
}
