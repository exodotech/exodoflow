// Hooks TanStack Query para clientes
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listarClientes, criarCliente, atualizarCliente, apagarCliente,
  criarVisitante, converterVisitante,
} from '@/services/clients'
import type { CriarClienteInput, AtualizarClienteInput, CriarVisitanteInput } from '@/lib/validators/client'

export const CLIENTES_QUERY_KEY = ['clientes'] as const

// Hook de leitura — lista todos os clientes do tenant
export function useClientes() {
  return useQuery({
    queryKey: CLIENTES_QUERY_KEY,
    queryFn:  listarClientes,
  })
}

// Hook de mutação — cria um novo cliente e invalida o cache
export function useCriarCliente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CriarClienteInput) => criarCliente(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLIENTES_QUERY_KEY })
    },
  })
}

// Hook de mutação — actualiza um cliente existente
export function useAtualizarCliente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AtualizarClienteInput }) =>
      atualizarCliente(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLIENTES_QUERY_KEY })
    },
  })
}

// Hook de mutação — cria um cliente VISITANTE (cadastro rápido)
export function useCriarVisitante() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CriarVisitanteInput) => criarVisitante(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: CLIENTES_QUERY_KEY }),
  })
}

// Hook de mutação — converte um visitante em cliente permanente
export function useConverterVisitante() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => converterVisitante(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: CLIENTES_QUERY_KEY }),
  })
}

// Hook de mutação — apaga (soft-delete) um cliente
export function useApagarCliente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apagarCliente(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLIENTES_QUERY_KEY })
    },
  })
}
