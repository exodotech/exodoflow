// Serviço client-side — configurações de agenda do tenant (settings JSONB).
// Merge seguro: preserva branding/relatorio/locale, só toca em settings.booking.
import { createClient } from '@/lib/supabase/client'
import { assertMutationSuccess } from '@/lib/supabase/assertMutationSuccess'
import { getTenantId } from '@/lib/supabase/getTenantId'
import { registarAuditoria } from '@/services/audit'

// Liga/desliga as Marcações Rápidas (settings.booking.allow_quick_booking).
export async function guardarPermitirMarcacaoRapida(permitir: boolean): Promise<void> {
  const supabase  = createClient()
  const tenant_id = await getTenantId()

  const { data: atual, error: loadErr } = await supabase
    .from('tenants').select('settings').eq('id', tenant_id).single()
  if (loadErr) throw new Error(`Erro ao carregar configurações: ${loadErr.message}`)

  const settingsAtuais = (atual?.settings ?? {}) as Record<string, unknown>
  const bookingAtual   = (settingsAtuais.booking ?? {}) as Record<string, unknown>

  const { data, error } = await supabase
    .from('tenants')
    .update({ settings: { ...settingsAtuais, booking: { ...bookingAtual, allow_quick_booking: permitir } } })
    .eq('id', tenant_id)
    .select('id')
  assertMutationSuccess(data, error, 'guardar configuração de agenda')
  await registarAuditoria('company.update', { table: 'tenants', recordId: tenant_id, metadata: { section: 'booking', allow_quick_booking: permitir } })
}
