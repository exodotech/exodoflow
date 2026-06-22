// Exportação de dados de um titular (cliente) — direito de acesso/portabilidade
// (LGPD art. 18 / RGPD art. 15 e 20). Reúne os dados pessoais que o tenant tem
// sobre o cliente num JSON portável. RLS garante o âmbito do tenant; finanças e
// fichas só são lidas por owner/manager (RLS dessas tabelas).
import { createClient } from '@/lib/supabase/client'
import { registarAuditoria } from '@/services/audit'

export interface ExportacaoTitular {
  meta: {
    exported_at: string
    standard: string
    client_id: string
    aviso: string
  }
  cliente: unknown
  consentimentos: unknown[]
  marcacoes: unknown[]
  fichas_tratamento: unknown[]
  avaliacoes: unknown[]
  pacotes: unknown[]
  financeiro: unknown[]
  lista_espera: unknown[]
}

// Recolhe todos os dados pessoais associados a um cliente. As queries que o
// utilizador não tenha permissão de ler (RLS) devolvem vazio — não falham.
export async function exportarDadosTitular(clientId: string): Promise<ExportacaoTitular> {
  const supabase = createClient()

  const safe = async <T>(p: PromiseLike<{ data: T | null }>): Promise<T extends unknown[] ? T : T[]> => {
    try { const { data } = await p; return (data ?? []) as never } catch { return [] as never }
  }

  const [cliente, consentimentos, marcacoes, fichas, avaliacoes, pacotes, financeiro, espera] = await Promise.all([
    supabase.from('clients').select('*').eq('id', clientId).maybeSingle().then((r) => r.data),
    safe(supabase.from('legal_consents').select('*').eq('client_id', clientId)),
    safe(supabase.from('bookings').select('*, service:services(name)').eq('client_id', clientId)),
    safe(supabase.from('treatment_records').select('*').eq('client_id', clientId)),
    safe(supabase.from('reviews').select('*').eq('client_id', clientId)),
    safe(supabase.from('client_packages').select('*').eq('client_id', clientId)),
    safe(supabase.from('financial_transactions').select('*').eq('client_id', clientId).is('deleted_at', null)),
    safe(supabase.from('waitlist').select('*').eq('client_id', clientId)),
  ])

  await registarAuditoria('dsr.export', { table: 'clients', recordId: clientId })

  return {
    meta: {
      exported_at: new Date().toISOString(),
      standard: 'LGPD art. 18 / RGPD art. 15 e 20 (acesso e portabilidade)',
      client_id: clientId,
      aviso: 'Exportação de controlo interno. Confirme a identidade do requerente antes de entregar.',
    },
    cliente,
    consentimentos,
    marcacoes,
    fichas_tratamento: fichas,
    avaliacoes,
    pacotes,
    financeiro,
    lista_espera: espera,
  }
}

// Dispara o download do JSON no browser.
export function descarregarExportacao(exp: ExportacaoTitular, nomeCliente: string): void {
  const slug = nomeCliente.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'cliente'
  const blob = new Blob([JSON.stringify(exp, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dados-${slug}-${exp.meta.exported_at.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
