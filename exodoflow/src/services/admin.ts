// Serviço de administração do SISTEMA (SOMENTE SUPERADMIN).
// Tudo passa por RPCs SECURITY DEFINER gated a superadmin (a RLS de tenant não
// se aplica ao superadmin — tenant_id é NULL). NUNCA expõe dados operacionais
// de clientes (telefone/e-mail/notas) — só nome/e-mail do OWNER e contagens.
import { createClient } from '@/lib/supabase/client'
import { deriveMarketSettings, toMarketCountry, type MarketCountry } from '@/lib/i18n/market'

// ── Tipos ────────────────────────────────────────────────────────────────────
export interface EmpresaAdmin {
  id:                   string
  name:                 string
  slug:                 string
  country:              string
  business_type:        string
  is_active:            boolean
  onboarding_completed: boolean
  plan_id:              string | null
  created_at:           string
  owner_id:             string | null
  owner_name:           string | null
  owner_email:          string | null
  owner_is_active:      boolean | null
  owner_created_at:     string | null
  owner_last_login:     string | null
  user_count:           number
  client_count:         number
  booking_count:        number
}

export interface MetricasAdmin {
  total_tenants:     number
  active_tenants:    number
  suspended_tenants: number
  trial_tenants:     number
  total_users:       number
  total_clients:     number
  total_bookings:    number
}

export interface SystemAuditRow {
  id:               string
  actor_email:      string | null
  action:           string
  entity_type:      string | null
  target_tenant_id: string | null
  description:      string | null
  metadata:         Record<string, unknown> | null
  created_at:       string
}

// ── Leituras (RPC superadmin) ────────────────────────────────────────────────
export async function listarEmpresasAdmin(): Promise<EmpresaAdmin[]> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('admin_list_tenants')
  if (error) throw new Error(`Erro ao listar empresas: ${error.message}`)
  const rows = (data ?? []) as EmpresaAdmin[]
  return rows.map((r) => ({
    ...r,
    user_count:    Number(r.user_count    ?? 0),
    client_count:  Number(r.client_count  ?? 0),
    booking_count: Number(r.booking_count ?? 0),
  }))
}

// Lista os OWNERS (um por tenant) — reaproveita admin_list_tenants. Tenants sem
// owner são excluídos. Devolve uma visão centrada no owner para /admin/utilizadores.
export interface OwnerAdmin {
  owner_id:        string
  owner_name:      string | null
  owner_email:     string | null
  owner_is_active: boolean | null
  owner_created_at: string | null
  owner_last_login: string | null
  tenant_id:       string
  tenant_name:     string
}
export async function listarOwnersAdmin(): Promise<OwnerAdmin[]> {
  const empresas = await listarEmpresasAdmin()
  return empresas
    .filter((e) => e.owner_id)
    .map((e) => ({
      owner_id:         e.owner_id as string,
      owner_name:       e.owner_name,
      owner_email:      e.owner_email,
      owner_is_active:  e.owner_is_active,
      owner_created_at: e.owner_created_at,
      owner_last_login: e.owner_last_login,
      tenant_id:        e.id,
      tenant_name:      e.name,
    }))
}

export async function obterMetricasAdmin(): Promise<MetricasAdmin> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('admin_tenant_metrics')
  if (error) throw new Error(`Erro ao obter métricas: ${error.message}`)
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, number> | undefined
  return {
    total_tenants:     Number(row?.total_tenants     ?? 0),
    active_tenants:    Number(row?.active_tenants    ?? 0),
    suspended_tenants: Number(row?.suspended_tenants ?? 0),
    trial_tenants:     Number(row?.trial_tenants     ?? 0),
    total_users:       Number(row?.total_users       ?? 0),
    total_clients:     Number(row?.total_clients     ?? 0),
    total_bookings:    Number(row?.total_bookings    ?? 0),
  }
}

export async function listarSystemAudit(limit = 100): Promise<SystemAuditRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('system_audit_logs')
    .select('id, actor_email, action, entity_type, target_tenant_id, description, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`Erro ao listar auditoria de sistema: ${error.message}`)
  return (data ?? []) as SystemAuditRow[]
}

// ── Escritas (com auditoria system-level) ────────────────────────────────────

// Regista uma acção de sistema; nunca quebra a operação principal.
async function registarSystemAudit(
  action: string,
  opts: { entityType?: string; entityId?: string; targetTenantId?: string; description?: string; metadata?: Record<string, unknown> } = {}
): Promise<void> {
  try {
    const supabase = createClient()
    await supabase.rpc('record_system_audit_log', {
      p_action:          action,
      p_entity_type:     opts.entityType ?? undefined,
      p_entity_id:       opts.entityId ?? undefined,
      p_target_tenant_id: opts.targetTenantId ?? undefined,
      p_description:     opts.description ?? undefined,
      p_metadata:        (opts.metadata ?? {}) as never,
    })
  } catch { /* auditoria não bloqueia a acção administrativa */ }
}

// Suspender / reactivar um tenant (is_active) + auditoria de sistema.
export async function definirEstadoTenant(tenantId: string, ativo: boolean, nome?: string): Promise<void> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tenants')
    .update({ is_active: ativo })
    .eq('id', tenantId)
    .select('id')
  if (error) throw new Error(error.message)
  if (!data?.length) throw new Error('Nenhuma linha afectada — verifique as permissões.')

  await registarSystemAudit(ativo ? 'tenant.reactivate' : 'tenant.suspend', {
    entityType: 'tenant', entityId: tenantId, targetTenantId: tenantId,
    description: `${ativo ? 'Reactivou' : 'Suspendeu'} a empresa${nome ? ` "${nome}"` : ''}`,
  })
}

// Alterar o PAÍS de um tenant (SÓ SUPERADMIN) + re-derivar fuso/moeda/locale.
// Operação sensível: muda moeda, fuso e tipo de documento fiscal (NIF↔CPF/CNPJ).
// O trigger lock_tenant_market (0018) garante que só o superadmin pode; a UI
// exige confirmação forte (digitar o nome da empresa). Preserva o resto dos settings.
export async function definirPaisTenant(tenantId: string, country: MarketCountry, nome?: string): Promise<void> {
  const supabase = createClient()
  const pais = toMarketCountry(country)
  const mercado = deriveMarketSettings(pais)

  // Carregar settings actuais para preservar tudo o que não deriva do país.
  const { data: atual, error: loadErr } = await supabase
    .from('tenants').select('settings').eq('id', tenantId).single()
  if (loadErr) throw new Error(`Erro ao carregar a empresa: ${loadErr.message}`)
  const settingsAtuais = (atual?.settings ?? {}) as Record<string, unknown>

  const { data, error } = await supabase
    .from('tenants')
    .update({
      country: pais,
      settings: {
        ...settingsAtuais,
        timezone: mercado.timezone,
        currency: mercado.currency,
        locale:   mercado.locale,
      },
    })
    .eq('id', tenantId)
    .select('id')
  if (error) throw new Error(error.message)
  if (!data?.length) throw new Error('Nenhuma linha afectada — verifique as permissões.')

  await registarSystemAudit('tenant.country_change', {
    entityType: 'tenant', entityId: tenantId, targetTenantId: tenantId,
    description: `Alterou o país de${nome ? ` "${nome}"` : ''} para ${pais}`,
    metadata: { country: pais, currency: mercado.currency, locale: mercado.locale },
  })
}

// Definir o plano de um tenant + auditoria de sistema.
export async function definirPlanoTenant(tenantId: string, planId: string | null, nome?: string): Promise<void> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tenants')
    .update({ plan_id: planId })
    .eq('id', tenantId)
    .select('id')
  if (error) throw new Error(error.message)
  if (!data?.length) throw new Error('Nenhuma linha afectada — verifique as permissões.')

  await registarSystemAudit('tenant.plan_change', {
    entityType: 'tenant', entityId: tenantId, targetTenantId: tenantId,
    description: `Alterou o plano de${nome ? ` "${nome}"` : ''}`,
    metadata: { plan_id: planId },
  })
}
