'use client'
// Error boundary GLOBAL — último recurso quando o erro acontece no próprio
// root layout. Tem de renderizar <html> e <body> próprios porque substitui
// o layout inteiro.
import { useEffect } from 'react'
import { reportError } from '@/lib/observability'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportError(error, { scope: 'boundary:global', digest: error.digest })
  }, [error])

  return (
    <html lang="pt">
      <body style={{ fontFamily: 'system-ui, sans-serif' }}>
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f9fafb',
            padding: '1rem',
          }}
        >
          <div
            style={{
              maxWidth: '28rem',
              width: '100%',
              background: '#fff',
              borderRadius: '0.75rem',
              border: '1px solid #e5e7eb',
              padding: '2rem',
              textAlign: 'center',
            }}
          >
            <h1 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>
              Erro crítico na aplicação
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
              {error.digest ? `Referência: ${error.digest}` : 'Erro inesperado no carregamento.'}
            </p>
            <button
              onClick={reset}
              style={{
                height: '2.75rem',
                padding: '0 1.5rem',
                borderRadius: '0.5rem',
                background: '#2563eb',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Recarregar aplicação
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
