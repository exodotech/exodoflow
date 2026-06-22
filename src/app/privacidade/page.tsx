import type { Metadata } from 'next'
import { LegalPage } from '@/components/brand/LegalPage'

export const metadata: Metadata = {
  title: 'Política de Privacidade — ExodoFlow Pro',
  description: 'Política de Privacidade do ExodoFlow Pro (em preparação).',
}

export default function PrivacidadePage() {
  return (
    <LegalPage
      titulo="Política de Privacidade"
      descricao="Como tratamos e protegemos os dados pessoais no ExodoFlow Pro."
    />
  )
}
