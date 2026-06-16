// Página 404 com marca — substitui o "404 | This page could not be found"
// default do Next.js por algo consistente com a identidade ExodoFlow Pro.
import Link from 'next/link'
import { Logo }      from '@/components/brand/Logo'
import { PoweredBy } from '@/components/brand/PoweredBy'

export default function NotFound() {
  return (
    <main
      className="min-h-screen app-bg flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8"
      style={{ ['--tenant-primary' as string]: 'var(--brand)' }}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8">
        <Logo variant="full" showTagline className="w-full" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/80 backdrop-blur-sm py-8 px-6 shadow-sm rounded-2xl border border-white/60 text-center">
          <p className="text-5xl font-bold text-slate-900">404</p>
          <h1 className="text-lg font-semibold text-slate-900 mt-3 mb-2">
            Página não encontrada
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            O endereço que tentou abrir não existe ou foi movido.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundImage: 'var(--brand-cta-gradient)' }}
          >
            Voltar ao início
          </Link>
        </div>

        <PoweredBy className="mt-6 text-center" legal />
      </div>
    </main>
  )
}
