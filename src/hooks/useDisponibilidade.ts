// Hook TanStack Query para verificar horários disponíveis via get_available_slots()
// Só executa quando todos os parâmetros obrigatórios estão preenchidos
import { useQuery } from '@tanstack/react-query'
import { buscarSlotsDisponiveis, type BuscarSlotsParams } from '@/services/disponibilidade'

export function useDisponibilidade(params: BuscarSlotsParams | null) {
  return useQuery({
    queryKey:  ['disponibilidade', params],
    queryFn:   () => buscarSlotsDisponiveis(params!),
    enabled:   params !== null && params.resource_ids.length > 0 && !!params.tenant_id,
    staleTime: 30_000,  // 30s — slots mudam com frequência
    retry: 1,
  })
}
