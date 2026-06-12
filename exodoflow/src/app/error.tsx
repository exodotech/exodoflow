'use client'
// Error boundary de rota — apanha erros de render/dados em qualquer página
// sem derrubar a aplicação inteira. O Next.js monta este componente
// automaticamente quando um erro não tratado sobe até à rota.
import { useEffect } from 'react'
import { reportError } from '@/lib/observability'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportError(error, { scope: 'boundary:route', digest: error.digest })
  }, [error])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
          <span className="text-red-600 text-xl">!</span>
        </div>
        <h1 className="text-lg font-semibold text-gray-900 mb-2">
          Algo correu mal
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Ocorreu um erro inesperado. Pode tentar novamente — se o problema
          persistir, contacte o suporte.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center h-11 px-6 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Tentar novamente
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center h-11 px-6 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Voltar ao início
          </a>
        </div>
      </div>
    </main>
  )
}
