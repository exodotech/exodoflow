// Página de diagnóstico — APENAS em desenvolvimento. Em produção devolve 404.
// Mostra rapidamente se um problema é de auth, perfil, tenant, RLS ou UI.
import { notFound } from 'next/navigation'
import { DiagnosticsClient } from './DiagnosticsClient'

export const dynamic = 'force-dynamic'

export default function DiagnosticsPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <DiagnosticsClient />
}
