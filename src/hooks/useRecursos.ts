// Hooks TanStack Query para recursos (colaboradores, salas, equipamentos)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listarRecursos, criarRecurso, atualizarRecurso, apagarRecurso } from '@/services/recursos'
import type { CriarRecursoInput, AtualizarRecursoInput } from '@/lib/validators/resource'

export const RECURSOS_QUERY_KEY = ['recursos'] as const

// Hook de leitura — lista todos os recursos activos do tenant
export function useRecursos() {
  return useQuery({
    queryKey: RECURSOS_QUERY_KEY,
    queryFn:  listarRecursos,
  })
}

// Invalida tudo o que depende de recursos (lista + recursos vinculáveis na equipa)
function useInvalidarRecursos() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: RECURSOS_QUERY_KEY })
    void queryClient.invalidateQueries({ queryKey: ['recursos-vinculaveis'] })
  }
}

export function useCriarRecurso() {
  const invalidar = useInvalidarRecursos()
  return useMutation({
    mutationFn: (input: CriarRecursoInput) => criarRecurso(input),
    onSuccess:  invalidar,
  })
}

export function useAtualizarRecurso() {
  const invalidar = useInvalidarRecursos()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AtualizarRecursoInput }) =>
      atualizarRecurso(id, input),
    onSuccess:  invalidar,
  })
}

export function useApagarRecurso() {
  const invalidar = useInvalidarRecursos()
  return useMutation({
    mutationFn: (id: string) => apagarRecurso(id),
    onSuccess:  invalidar,
  })
}
