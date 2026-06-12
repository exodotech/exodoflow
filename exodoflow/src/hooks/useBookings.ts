// Hooks TanStack Query para marcações (bookings)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listarBookings,
  criarBooking,
  atualizarStatusBooking,
  reagendarBooking,
  definirPagamentoBooking,
} from '@/services/bookings'
import type { AtualizarPagamentoInput } from '@/lib/validators/financas'
import { FINANCAS_KEY } from '@/hooks/useFinancas'
import {
  listarTemplatesComunicacao,
  simularEnvioComunicacao,
} from '@/services/communication'
import { formatDateShort, formatTime } from '@/lib/i18n/date'
import type { AtualizarStatusInput, ReagendarBookingInput } from '@/lib/validators/booking'
import type { CriarBookingInput } from '@/lib/validators/booking'

export const BOOKINGS_QUERY_KEY = ['bookings'] as const

// Hook de leitura — lista todas as marcações do tenant com dados relacionados
export function useBookings() {
  return useQuery({
    queryKey: BOOKINGS_QUERY_KEY,
    queryFn:  listarBookings,
  })
}

// Hook de mutação — cria nova marcação, associa recursos e simula log de comunicação
// A simulação de comunicação ocorre aqui (hook layer), NÃO dentro do serviço criarBooking,
// para preservar a separação de responsabilidades: a falha do log não afecta a marcação.
export function useCriarBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CriarBookingInput & { end_at: string }) => criarBooking(input),
    onSuccess: async (booking, input) => {
      void queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY })

      // Simulação de comunicação — não bloqueia nem falha a criação da marcação
      try {
        const templates = await listarTemplatesComunicacao()

        const clientName  = (input as { client_name?: string }).client_name ?? 'Cliente'
        const phoneNumber = (input as { client_phone?: string }).client_phone ?? ''
        const serviceName = (input as { service_name?: string }).service_name ?? 'Serviço'
        const staffName   = (input as { staff_name?: string }).staff_name ?? ''

        await simularEnvioComunicacao({
          event_type: 'booking_created',
          booking_id: booking.id,
          client_id:  input.client_id,
          recipient:  phoneNumber,
          context: {
            nome:         clientName,
            data:         formatDateShort(booking.start_at),
            hora:         formatTime(booking.start_at),
            servico:      serviceName,
            profissional: staffName,
          },
          templates,
        })
      } catch {
        // Falha silenciosa — a comunicação é best-effort nesta fase
      }
    },
  })
}

// Hook de mutação — actualiza o estado de uma marcação (confirmar, cancelar, etc.)
export function useAtualizarStatusBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AtualizarStatusInput }) =>
      atualizarStatusBooking(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY })
    },
  })
}

// Hook de mutação — define o estado de pagamento da marcação.
// Invalida bookings E finanças (o trigger pode ter criado uma receita).
export function useDefinirPagamento() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AtualizarPagamentoInput }) =>
      definirPagamentoBooking(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: FINANCAS_KEY })
    },
  })
}

// Hook de mutação — reagenda uma marcação (nova data/hora e recursos)
export function useReagendarBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReagendarBookingInput }) =>
      reagendarBooking(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY })
    },
  })
}
