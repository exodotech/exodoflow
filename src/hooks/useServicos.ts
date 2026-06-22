// Hooks TanStack Query para serviços do catálogo
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listarServicos, criarServico, atualizarServico, apagarServico } from '@/services/servicos'
import type { CriarServicoInput, AtualizarServicoInput } from '@/lib/validators/service'

export const SERVICOS_QUERY_KEY = ['servicos'] as const

// Hook de leitura — lista todos os serviços do tenant
export function useServicos() {
  return useQuery({
    queryKey: SERVICOS_QUERY_KEY,
    queryFn:  listarServicos,
  })
}

// Hook de mutação — cria novo serviço e invalida o cache
export function useCriarServico() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CriarServicoInput) => criarServico(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SERVICOS_QUERY_KEY })
    },
  })
}

// Hook de mutação — actualiza um serviço existente
export function useAtualizarServico() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AtualizarServicoInput }) =>
      atualizarServico(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SERVICOS_QUERY_KEY })
    },
  })
}

// Hook de mutação — apaga (soft-delete) um serviço
export function useApagarServico() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apagarServico(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SERVICOS_QUERY_KEY })
    },
  })
}
