import type { Metadata } from 'next'
import { LegalPage } from '@/components/brand/LegalPage'

export const metadata: Metadata = {
  title: 'Termos de Utilização — ExodoFlow Pro',
  description: 'Termos de Utilização do ExodoFlow Pro (em preparação).',
}

export default function TermosPage() {
  return (
    <LegalPage
      titulo="Termos de Utilização"
      descricao="As condições de utilização do serviço ExodoFlow Pro."
    />
  )
}
