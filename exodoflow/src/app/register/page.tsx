import React        from 'react'
import Link          from 'next/link'
import { Metadata }  from 'next'

export const metadata: Metadata = {
  title: 'Acesso por convite — ExodoFlow AI',
}

// REGISTO PÚBLICO DESACTIVADO (decisão de produto).
// Novos tenants são criados exclusivamente pelo administrador do sistema.
// O signup também está bloqueado no GoTrue (enable_signup = false), por isso
// esta página é apenas informativa — não há formulário.
export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-4">
          <span className="text-white font-bold text-lg">E</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">ExodoFlow AI</h1>
        <p className="mt-1 text-sm text-gray-500">
          Agenda inteligente para o seu negócio
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm rounded-xl border border-gray-200 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            Acesso por convite
          </h2>
          <p className="text-sm text-gray-600 mb-2">
            O ExodoFlow AI está em fase de acesso controlado. Novas contas são
            criadas pela nossa equipa.
          </p>
          <p className="text-sm text-gray-600 mb-6">
            Quer usar o ExodoFlow no seu negócio? Contacte-nos para receber o
            seu acesso.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center h-11 px-6 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Já tenho conta — iniciar sessão
          </Link>
        </div>
      </div>
    </main>
  )
}
