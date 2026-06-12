// Provedor do TanStack Query para toda a aplicação
// Envolver o layout raiz com este componente para activar useQuery/useMutation
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode }         from 'react'

export function QueryProvider({ children }: { children: ReactNode }) {
  // Criar uma instância por componente para evitar partilha de cache entre pedidos no servidor
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime:            60 * 1000, // 1 minuto — dados considerados frescos
            retry:                1,          // tentar novamente apenas uma vez em erro
            refetchOnWindowFocus: false,      // evitar re-fetch ao focar a janela (agenda sensível a conflitos)
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
