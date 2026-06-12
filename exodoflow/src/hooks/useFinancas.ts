// Hooks TanStack Query — Módulo Financeiro.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listarTransacoes, criarTransacao, atualizarTransacao, apagarTransacao,
  type FiltrosFinancas,
} from '@/services/financas'
import type { CriarTransacaoInput, AtualizarTransacaoInput } from '@/lib/validators/financas'

export const FINANCAS_KEY = ['financas'] as const

export function useTransacoes(filtros: FiltrosFinancas) {
  return useQuery({
    queryKey: [...FINANCAS_KEY, filtros],
    queryFn:  () => listarTransacoes(filtros),
  })
}

export function useCriarTransacao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ input, currency }: { input: CriarTransacaoInput; currency: string }) => criarTransacao(input, currency),
    onSuccess:  () => void qc.invalidateQueries({ queryKey: FINANCAS_KEY }),
  })
}

export function useAtualizarTransacao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AtualizarTransacaoInput }) => atualizarTransacao(id, input),
    onSuccess:  () => void qc.invalidateQueries({ queryKey: FINANCAS_KEY }),
  })
}

export function useApagarTransacao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apagarTransacao(id),
    onSuccess:  () => void qc.invalidateQueries({ queryKey: FINANCAS_KEY }),
  })
}
