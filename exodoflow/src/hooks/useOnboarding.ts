// Hooks TanStack Query para o fluxo de onboarding
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  salvarEmpresa,
  confirmarNicho,
  criarPrimeiroServico,
  criarPrimeiroRecurso,
  criarDisponibilidade,
  criarConvitesEquipa,
  finalizarOnboarding,
  carregarEstadoOnboarding,
} from '@/services/onboarding'
import type { Step1EmpresaInput }         from '@/lib/validators/onboarding'
import type { Step3ServicoInput }         from '@/lib/validators/onboarding'
import type { Step4RecursoInput }         from '@/lib/validators/onboarding'
import type { Step5DisponibilidadeInput } from '@/lib/validators/onboarding'
import type { ConviteInput }              from '@/lib/validators/onboarding'

export const ONBOARDING_QUERY_KEY = ['onboarding-state'] as const

// Carrega o estado do onboarding do tenant actual
export function useOnboardingState() {
  return useQuery({
    queryKey: ONBOARDING_QUERY_KEY,
    queryFn:  carregarEstadoOnboarding,
    staleTime: 0,
  })
}

// Passo 1 — empresa
export function useSalvarEmpresa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Step1EmpresaInput) => salvarEmpresa(input),
    onSuccess:  () => void qc.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY }),
  })
}

// Passo 2 — nicho (somente confirmação; o nicho é imutável, definido na criação)
export function useConfirmarNicho() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => confirmarNicho(),
    onSuccess:  () => void qc.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY }),
  })
}

// Passo 3 — primeiro serviço
export function useCriarPrimeiroServico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Step3ServicoInput) => criarPrimeiroServico(input),
    onSuccess:  () => void qc.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY }),
  })
}

// Passo 4 — primeiro recurso
export function useCriarPrimeiroRecurso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ input, ownerProfileId }: { input: Step4RecursoInput; ownerProfileId: string }) =>
      criarPrimeiroRecurso(input, ownerProfileId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY }),
  })
}

// Passo 5 — disponibilidade
export function useCriarDisponibilidade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ input, resourceId }: { input: Step5DisponibilidadeInput; resourceId: string }) =>
      criarDisponibilidade(input, resourceId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY }),
  })
}

// Passo 6 — equipa
export function useCriarConvitesEquipa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ convites, invitedBy }: { convites: ConviteInput[]; invitedBy: string }) =>
      criarConvitesEquipa(convites, invitedBy),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY }),
  })
}

// Passo 7 — finalizar
export function useFinalizarOnboarding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: finalizarOnboarding,
    onSuccess:  () => void qc.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY }),
  })
}
