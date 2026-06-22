// Página de subscrição em falta — Server Component.
// Mostrada quando um plano PAGO está com pagamento em atraso ou cancelado.
// Tem o seu próprio guard: não vive dentro de /dashboard (entraria em loop com o
// redirect do dashboard/layout). Planos gratuitos nunca chegam aqui.
import type { Metadata } from 'next'
import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/features/auth/LogoutButton'
import { ExodoTechLink } from '@/components/brand/PoweredBy'
import { subscricaoBloqueia, type SubscriptionStatus } from '@/lib/billing/plan'

export const metadata: Metadata = { title: 'Subscrição — ExodoFlow Pro' }

export default async function AssinaturaPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, tenant_id').eq('id', user.id).single()
  if (profile?.role === 'superadmin') redirect('/admin')

  // Re-deriva o bloqueio: só fica aqui quem está MESMO bloqueado.
  let bloqueado = false
  if (profile?.tenant_id) {
    const { data: t } = await supabase
      .from('tenants').select('plan_id, subscription_status').eq('id', profile.tenant_id).single()
    if (t?.plan_id) {
      const { data: plan } = await supabase
        .from('plans').select('price_monthly').eq('id', t.plan_id).single()
      bloqueado = !!plan && subscricaoBloqueia(
        { price_monthly: plan.price_monthly },
        (t.subscription_status ?? 'none') as SubscriptionStatus,
      )
    }
  }
  if (!bloqueado) redirect('/dashboard')

  return (
    <main className="min-h-screen app-bg flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 rounded-full mb-4">
          <span className="text-amber-600 text-xl">💳</span>
        </div>
        <h1 className="text-lg font-semibold text-gray-900 mb-2">
          Subscrição inativa
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          O acesso a esta conta está em pausa porque a subscrição está com
          pagamento em atraso ou foi cancelada. Regularize o pagamento para
          reativar — fale connosco para o ajudarmos.
        </p>
        <div className="flex flex-col gap-3">
          <a
            href="https://www.exodotech.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundImage: 'var(--brand-cta-gradient)' }}
          >
            Falar com o suporte
          </a>
          <LogoutButton />
        </div>
        <p className="mt-6 text-xs text-slate-400">
          ExodoFlow Pro · <ExodoTechLink className="text-slate-500" />
        </p>
      </div>
    </main>
  )
}
