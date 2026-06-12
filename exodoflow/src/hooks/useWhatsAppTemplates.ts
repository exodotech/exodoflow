// Hooks TanStack Query para o WhatsApp operacional (Fase 1C — templates).
import { useQuery, useMutation } from '@tanstack/react-query'
import { obterEstadoWhatsApp, enviarTemplateMarcacao } from '@/services/whatsapp'
import type { TemplatePurpose } from '@/types/domain/communication'

export const WHATSAPP_ESTADO_QUERY_KEY = ['whatsapp', 'estado'] as const

// Estado do canal WhatsApp do tenant (existe + activo). Usado para mostrar/ocultar
// as acções de template na agenda (botões só activos com canal configurado).
export function useEstadoWhatsApp() {
  return useQuery({
    queryKey:  WHATSAPP_ESTADO_QUERY_KEY,
    queryFn:   obterEstadoWhatsApp,
    staleTime: 60_000,
  })
}

// Envio MANUAL de um template ligado a uma marcação. Não invalida a lista de
// marcações (o envio não altera a marcação); o feedback é local ao botão.
export function useEnviarTemplate() {
  return useMutation({
    mutationFn: ({ bookingId, purpose }: { bookingId: string; purpose: TemplatePurpose }) =>
      enviarTemplateMarcacao(bookingId, purpose),
  })
}
