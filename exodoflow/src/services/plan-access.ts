// Acesso a funcionalidades por PLANO — SERVER-SIDE apenas (admin client).
// Fonte de verdade: plans.features (do plano do tenant). As feature_flags por
// tenant funcionam como OVERRIDE do superadmin (ex.: ligar a IA a um tenant free
// numa demo, ou desligar algo pontualmente). Se existir flag, ela manda; caso
// contrário vale o default do plano.
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Admin = SupabaseClient<Database>

// Funcionalidades controláveis e o respetivo mapeamento:
//   planKey → chave em plans.features ; flag → nome em feature_flags
export type TenantFeature = 'booking_portal' | 'whatsapp' | 'ai'

const FEATURE_MAP: Record<TenantFeature, { planKey: string; flag: string }> = {
  booking_portal: { planKey: 'booking_portal',     flag: 'booking_portal' },
  whatsapp:       { planKey: 'whatsapp_simulator', flag: 'whatsapp_real' },
  ai:             { planKey: 'ai',                 flag: 'ai_enabled' },
}

// O tenant pode usar a funcionalidade? (default do plano, com override por flag)
export async function podeUsarFeature(
  admin: Admin,
  tenantId: string,
  feature: TenantFeature,
): Promise<boolean> {
  const { planKey, flag } = FEATURE_MAP[feature]

  // 1) Default do plano (plans.features[planKey])
  let planAllows = false
  const { data: t } = await admin
    .from('tenants').select('plan_id').eq('id', tenantId).maybeSingle()
  if (t?.plan_id) {
    const { data: p } = await admin
      .from('plans').select('features').eq('id', t.plan_id).maybeSingle()
    const features = (p?.features ?? {}) as Record<string, unknown>
    planAllows = features[planKey] === true
  }

  // 2) Override do superadmin (se existir linha de flag, ela decide)
  const { data: f } = await admin
    .from('feature_flags').select('is_enabled')
    .eq('tenant_id', tenantId).eq('flag_name', flag).maybeSingle()
  if (f) return f.is_enabled

  return planAllows
}
