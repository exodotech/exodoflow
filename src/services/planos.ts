// Serviço cliente de planos/subscrição (sem service_role).
// Lê os planos (RLS: qualquer autenticado pode ver) e chama a API de checkout.
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import type { BillingCycle } from '@/lib/billing/plan'

export type Plan = Database['public']['Tables']['plans']['Row']

export async function listarPlanos(): Promise<Plan[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('plans').select('*').eq('is_active', true).order('sort_order', { ascending: true })
  if (error) throw new Error(`Erro ao listar planos: ${error.message}`)
  return (data ?? []) as Plan[]
}

// Inicia o checkout via API server-side. Devolve a URL para redirecionar.
export async function iniciarCheckout(planSlug: string, cycle: BillingCycle): Promise<{ url: string; mock: boolean }> {
  const res = await fetch('/api/billing/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planSlug, cycle }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error ?? 'Erro ao iniciar a subscrição.')
  return data as { url: string; mock: boolean }
}
