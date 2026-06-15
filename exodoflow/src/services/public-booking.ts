// Serviço do PORTAL PÚBLICO de marcação — SERVER-SIDE apenas (admin client).
// NUNCA importar em código cliente. Toda a leitura/escrita pública passa por
// aqui, validando que o tenant existe, está ativo e tem o booking_portal ligado.
// O cliente do browser fala com as API routes /api/public/* (com rate-limit),
// não com o Supabase — zero superfície de acesso anónimo.
import { createAdminClient } from '@/lib/supabase/admin'
import type { SlotDisponivel } from '@/services/disponibilidade'

export interface PortalTenant {
  id:            string
  name:          string
  slug:          string
  business_type: string
  primary_color: string | null
  logo_url:      string | null
}
export interface PortalServico {
  id: string; name: string; duration_minutes: number; price: number | null; color: string | null
}

// Verifica se o portal está ligado para o tenant (feature_flags) e devolve o
// tenant ativo por slug. Devolve null se não existe / inativo / portal desligado.
export async function getPortalTenant(slug: string): Promise<PortalTenant | null> {
  const admin = createAdminClient()
  const { data: t } = await admin
    .from('tenants')
    .select('id, name, slug, business_type, is_active, settings')
    .eq('slug', slug)
    .maybeSingle()
  if (!t || t.is_active === false) return null

  const { data: flag } = await admin
    .from('feature_flags')
    .select('is_enabled')
    .eq('tenant_id', t.id)
    .eq('flag_name', 'booking_portal')
    .maybeSingle()
  if (!flag?.is_enabled) return null

  const branding = (t.settings as { branding?: { primary_color?: string; logo_url?: string } } | null)?.branding
  return {
    id: t.id, name: t.name, slug: t.slug, business_type: t.business_type,
    primary_color: branding?.primary_color ?? null,
    logo_url:      branding?.logo_url ?? null,
  }
}

export async function getPortalServicos(tenantId: string): Promise<PortalServico[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('services')
    .select('id, name, duration_minutes, price, color')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as PortalServico[]
}

// IDs dos profissionais ativos (staff) — usados para procurar slots.
async function staffIds(tenantId: string): Promise<string[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('resources')
    .select('id').eq('tenant_id', tenantId).eq('type', 'staff').eq('is_active', true).is('deleted_at', null)
  return (data ?? []).map((r) => r.id)
}

// Slots disponíveis para um serviço numa data (em qualquer profissional).
export async function getPortalSlots(tenantId: string, serviceId: string, date: string): Promise<SlotDisponivel[]> {
  const admin = createAdminClient()
  const recursos = await staffIds(tenantId)
  if (recursos.length === 0) return []
  const { data, error } = await admin.rpc('get_available_slots', {
    p_tenant_id: tenantId,
    p_resource_ids: recursos,
    p_service_id: serviceId,
    p_start_date: date,
    p_end_date: date,
    p_slot_interval_minutes: 15,
  })
  if (error) throw new Error(error.message)
  return (data ?? []) as SlotDisponivel[]
}

export interface CriarMarcacaoPublicaInput {
  tenantId: string; serviceId: string; start_at: string; end_at: string; resource_id: string
  name: string; phone?: string
}

// Cria a marcação pública: visitante (is_guest) + booking 'pending' + recurso.
// Revalida o slot antes de inserir (defesa contra slot já ocupado).
export async function criarMarcacaoPublica(input: CriarMarcacaoPublicaInput): Promise<{ ok: true }> {
  const admin = createAdminClient()

  // 1. Revalidar disponibilidade do slot escolhido
  const dia = input.start_at.slice(0, 10)
  const slots = await getPortalSlots(input.tenantId, input.serviceId, dia)
  const livre = slots.some((s) => s.slot_start === input.start_at && s.resource_id === input.resource_id)
  if (!livre) throw new Error('Esse horário já não está disponível. Escolha outro.')

  // 2. Criar visitante (cadastro mínimo, sem consentimento — RGPD)
  const { data: cliente, error: cErr } = await admin
    .from('clients')
    .insert({ tenant_id: input.tenantId, full_name: input.name.trim(), phone: input.phone?.trim() || null, is_guest: true })
    .select('id').single()
  if (cErr || !cliente) throw new Error('Não foi possível registar o cliente.')

  // 3. Criar a marcação (pending — a clínica confirma) + recurso
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .insert({
      tenant_id: input.tenantId, client_id: cliente.id, service_id: input.serviceId,
      start_at: input.start_at, end_at: input.end_at, status: 'pending', source: 'booking_portal',
    })
    .select('id').single()
  if (bErr || !booking) throw new Error('Não foi possível criar a marcação.')

  const { error: rErr } = await admin
    .from('booking_resources')
    .insert({ tenant_id: input.tenantId, booking_id: booking.id, resource_id: input.resource_id })
  if (rErr) throw new Error('Não foi possível associar o profissional.')

  return { ok: true }
}
