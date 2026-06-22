// Serviço client-side — configurações de relatórios do tenant (settings JSONB).
// Segue o padrão de branding.ts: merge seguro de settings, nunca sobrescreve.
import { createClient } from '@/lib/supabase/client'
import { assertMutationSuccess } from '@/lib/supabase/assertMutationSuccess'
import { getTenantId } from '@/lib/supabase/getTenantId'
import { registarAuditoria } from '@/services/audit'
import type { RelatorioSettingsInput } from '@/lib/validators/relatorio'

// Guarda as configurações de relatório no JSONB tenant.settings.relatorio
export async function guardarRelatorioSettings(input: RelatorioSettingsInput): Promise<void> {
  const supabase  = createClient()
  const tenant_id = await getTenantId()

  // Carregar settings actuais para merge seguro (preserva branding, locale, etc.)
  const { data: atual, error: loadErr } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenant_id)
    .single()
  if (loadErr) throw new Error(`Erro ao carregar configurações: ${loadErr.message}`)

  const settingsAtuais = (atual?.settings ?? {}) as Record<string, unknown>
  const novoSettings   = {
    ...settingsAtuais,
    relatorio: {
      email_destino:    input.email_destino,
      hora_envio:       input.hora_envio,
      relatorio_diario: input.relatorio_diario,
      relatorio_mensal: input.relatorio_mensal,
    },
  }

  const { data, error } = await supabase
    .from('tenants')
    .update({ settings: novoSettings })
    .eq('id', tenant_id)
    .select('id')
  assertMutationSuccess(data, error, 'guardar configurações de relatório')
  await registarAuditoria('company.update', { table: 'tenants', recordId: tenant_id, metadata: { section: 'relatorio' } })
}
