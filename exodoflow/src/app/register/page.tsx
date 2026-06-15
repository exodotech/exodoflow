import React        from 'react'
import Link          from 'next/link'
import { Metadata }  from 'next'
import { Logo }      from '@/components/brand/Logo'
import { PoweredBy } from '@/components/brand/PoweredBy'

export const metadata: Metadata = {
  title: 'Acesso por convite — ExodoFlow Pro',
}

// REGISTO PÚBLICO DESACTIVADO (decisão de produto).
// Novos tenants são criados exclusivamente pelo administrador do sistema.
// O signup também está bloqueado no GoTrue (enable_signup = false), por isso
// esta página é apenas informativa — não há formulário.
export default function RegisterPage() {
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
          <h2 className="text-xl font-semibold text-slate-900 mb-3">
            Acesso por convite
          </h2>
          <p className="text-sm text-slate-600 mb-2">
            O ExodoFlow Pro está em fase de acesso controlado. Novas contas são
            criadas pela nossa equipa.
          </p>
          <p className="text-sm text-slate-600 mb-6">
            Quer usar o ExodoFlow no seu negócio? Contacte-nos para receber o
            seu acesso.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundImage: 'var(--brand-cta-gradient)' }}
          >
            Já tenho conta — iniciar sessão
          </Link>
        </div>

        <PoweredBy className="mt-6 text-center" />
      </div>
    </main>
  )
}
