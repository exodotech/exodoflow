// Portal público de marcação — /marcar/[slug]. Rota pública (sem auth).
// Server shell fino: resolve o slug e delega ao client component, que fala só
// com as API routes /api/public/* (rate-limited, server-side).
import type { Metadata } from 'next'
import { PortalMarcacao } from '@/components/features/portal/PortalMarcacao'

export const metadata: Metadata = {
  title: 'Marcar — ExodoFlow Pro',
  robots: { index: false },   // portais de tenant não devem ser indexados
}

export default async function MarcarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <PortalMarcacao slug={slug} />
}
