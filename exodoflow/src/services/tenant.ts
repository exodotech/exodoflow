// Serviço de acesso ao perfil e tenant do utilizador autenticado
// Usado pelo AuthProvider e pelas páginas que precisam de contexto de tenant
import { createClient } from '@/lib/supabase/client'
import { getTenantId }  from '@/lib/supabase/getTenantId'
import { assertMutationSuccess } from '@/lib/supabase/assertMutationSuccess'
import { registarAuditoria } from '@/services/audit'
import type { AtualizarEmpresaInput } from '@/lib/validators/empresa'

// Carrega o perfil completo do utilizador autenticado
export async function carregarPerfil() {
  const supabase = createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Utilizador não autenticado')

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) throw new Error(`Erro ao carregar perfil: ${error.message}`)
  return data
}

// Carrega o tenant pelo ID (usado após ter o tenant_id do perfil)
export async function carregarTenant(tenantId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single()

  if (error) throw new Error(`Erro ao carregar tenant: ${error.message}`)
  return data
}

// Actualiza os dados OPERACIONAIS da empresa (apenas OWNER via RLS).
// NUNCA altera country, business_type, locale, currency nem timezone — esses
// são imutáveis após a criação (ver migração 0018). MERGE SEGURO de settings:
// carrega os actuais e faz spread, preservando branding/communication/locale/
// currency/timezone e tudo o resto.
export async function atualizarDadosEmpresa(input: AtualizarEmpresaInput): Promise<void> {
  const supabase  = createClient()
  const tenant_id = await getTenantId()

  // 1. Carregar settings + address actuais para preservar tudo o que não muda
  const { data: atual, error: loadError } = await supabase
    .from('tenants')
    .select('settings, address')
    .eq('id', tenant_id)
    .single()
  if (loadError) throw new Error(`Erro ao carregar dados actuais: ${loadError.message}`)

  const settingsAtuais = (atual?.settings ?? {}) as Record<string, unknown>
  const addressAtual   = (atual?.address  ?? {}) as Record<string, unknown>

  // 2. Merge consciente — só toca em website/tax_id; preserva locale/currency/
  //    timezone/branding/communication e qualquer outra chave intacta.
  const novoSettings = {
    ...settingsAtuais,
    website: input.website || undefined,
    tax_id:  input.tax_id  || undefined,
  }
  const novoAddress = {
    ...addressAtual,
    street:        input.street        || undefined,
    address_line2: input.address_line2 || undefined,
    city:          input.city          || undefined,
    region:        input.region        || undefined,
    postal_code:   input.postal_code   || undefined,
  }

  // 3. Só colunas operacionais seguras — country/business_type ficam de fora
  const { data, error } = await supabase
    .from('tenants')
    .update({
      name:     input.name,
      slug:     input.slug,
      phone:    input.phone || null,
      email:    input.email || null,
      settings: novoSettings,
      address:  novoAddress,
    })
    .eq('id', tenant_id)
    .select('id')

  // Slug duplicado é o erro esperável mais comum — mensagem clara
  if (error && error.code === '23505') {
    throw new Error('Esse identificador (slug) já está em uso. Escolha outro.')
  }
  assertMutationSuccess(data, error, 'actualizar dados da empresa')
  await registarAuditoria('company.update', { table: 'tenants', recordId: tenant_id })
}
