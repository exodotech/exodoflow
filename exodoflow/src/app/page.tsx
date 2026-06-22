import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LandingNav } from '@/components/features/marketing/LandingNav'
import { LandingPricing } from '@/components/features/marketing/LandingPricing'
import { LandingFaq } from '@/components/features/marketing/LandingFaq'
import {
  Hero, Features, HowItWorks, Security, FinalCta, Footer,
} from '@/components/features/marketing/LandingSections'

const DESCRIPTION =
  'ExodoFlow Pro — agenda online, portal de marcações 24/7, lembretes automáticos por WhatsApp e assistente com IA. A plataforma completa para gerir e fazer crescer o seu negócio de serviços.'

// SEO da página inicial (sobrescreve o título genérico do layout raiz).
export const metadata: Metadata = {
  title: 'ExodoFlow Pro — Agenda e automação com IA para o seu negócio',
  description: DESCRIPTION,
  // Palavras-chave abrangentes (vários setores) — ajudam o SEO sem limitar a marca.
  keywords: [
    'software de marcações', 'agenda online', 'portal de marcações',
    'gestão de clientes', 'lembretes WhatsApp', 'assistente IA',
    'software para clínicas', 'software para barbearias', 'agenda para oficinas',
    'marcações online', 'ExodoFlow',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'pt_PT',
    siteName: 'ExodoFlow Pro',
    title: 'ExodoFlow Pro — Agenda e automação com IA',
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
}

// Dados estruturados (Schema.org) — ajudam o SEO a entender o produto.
const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ExodoFlow Pro',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: DESCRIPTION,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
    description: 'Plano gratuito para começar.',
  },
  publisher: { '@type': 'Organization', name: 'Êxodo Tech', url: 'https://www.exodotech.com' },
}

export default async function HomePage() {
  // Visitante autenticado vai direto para a sua área. A verificação está num
  // try/catch para que a landing PÚBLICA renderize mesmo que o Supabase ainda
  // não esteja configurado (ex.: primeiro deploy). O redirect() fica FORA do
  // try — ele lança um controlo de fluxo interno que não deve ser apanhado.
  let destino: string | null = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      destino = profile?.role === 'superadmin' ? '/admin' : '/dashboard'
    }
  } catch {
    destino = null
  }
  if (destino) redirect(destino)

  return (
    <div
      className="app-bg"
      // A landing não tem tenant: usa a cor da MARCA (teal) e o gradiente da
      // marca nas CTAs, tal como as telas de autenticação.
      style={{ ['--tenant-primary' as string]: 'var(--brand)', ['--btn-gradient' as string]: 'var(--brand-cta-gradient)' }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <LandingNav />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <LandingPricing />
        <Security />
        <LandingFaq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
