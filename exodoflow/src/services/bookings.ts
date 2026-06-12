// Serviço de acesso a dados — Marcações (Bookings)
// Camada entre os componentes React e o Supabase
// Usado com TanStack Query (useQuery / useMutation)
import { createClient }  from '@/lib/supabase/client'
import { registarAuditoria } from '@/services/audit'
import type { BookingWithRelations, BookingStatus, BookingSource } from '@/types/domain/booking'
import type { CriarBookingInput, AtualizarStatusInput, ReagendarBookingInput } from '@/lib/validators/booking'
import type { AtualizarPagamentoInput } from '@/lib/validators/financas'

// Normaliza a resposta do PostgREST (booking_resources aninhado) para BookingWithRelations
// O PostgREST retorna { booking_resources: [{ resource_id, resource: {...} }] }
// O nosso tipo de domínio espera { resources: [{ id, name, type }] }
function normalizeBooking(raw: Record<string, unknown>): BookingWithRelations {
  const bookingResources = raw.booking_resources as Array<{
    resource_id: string
    resource: { id: string; name: string; type: string; color: string } | null
  }> | undefined

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { booking_resources: _br, ...rest } = raw

  return {
    ...(rest as Omit<BookingWithRelations, 'resources'>),
    status:    (rest.status as BookingStatus)  ?? 'pending',
    source:    (rest.source as BookingSource)  ?? 'manual',
    resources: (bookingResources ?? [])
      .map((br) => br.resource)
      .filter((r): r is NonNullable<typeof r> => r !== null),
  }
}

// Busca todas as marcações do tenant com dados relacionados (RLS garante isolamento)
export async function listarBookings(): Promise<BookingWithRelations[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      client:clients(id, full_name, phone),
      service:services(id, name, duration_minutes, color, price),
      booking_resources(
        resource_id,
        resource:resources(id, name, type, color)
      )
    `)
    .order('start_at', { ascending: true })
    .limit(500)   // protecção contra payloads gigantes; paginação real virá com a agenda por período

  if (error) throw new Error(`Erro ao listar marcações: ${error.message}`)
  return (data ?? []).map((item) => normalizeBooking(item as Record<string, unknown>))
}

// Busca marcações de um intervalo de datas
export async function listarBookingsPorData(
  inicio: string,
  fim: string
): Promise<BookingWithRelations[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      client:clients(id, full_name, phone),
      service:services(id, name, duration_minutes, color, price),
      booking_resources(resource_id, resource:resources(id, name, type))
    `)
    .gte('start_at', inicio)
    .lte('start_at', fim)
    .not('status', 'eq', 'cancelled')
    .order('start_at', { ascending: true })
    .limit(500)

  if (error) throw new Error(`Erro ao listar marcações por data: ${error.message}`)
  return (data ?? []).map((item) => normalizeBooking(item as Record<string, unknown>))
}

// Lista as marcações de um cliente (para o detalhe do cliente).
// Inclui o serviço para mostrar nome/cor; ordenado da mais recente para a antiga.
export async function listarBookingsPorCliente(clientId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('bookings')
    .select('id, start_at, end_at, status, service:services(name, color)')
    .eq('client_id', clientId)
    .order('start_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(`Erro ao listar marcações do cliente: ${error.message}`)
  return data ?? []
}

// Cria uma nova marcação e associa os recursos via booking_resources
export async function criarBooking(
  input: CriarBookingInput & { end_at: string }
) {
  const supabase = createClient()

  // RPC transacional: lock por recurso + verificação de conflito + INSERT de
  // booking e booking_resources na mesma transacção. Impede double-booking
  // (dois utilizadores no mesmo slot) e bookings órfãos sem recurso.
  const { data: booking, error } = await supabase.rpc('create_booking', {
    p_client_id:    input.client_id,
    p_service_id:   input.service_id,
    p_start_at:     input.start_at,
    p_end_at:       input.end_at,
    p_resource_ids: input.resource_ids,
    p_notes:        input.notes ?? null,
  })

  if (error) throw new Error(`Erro ao criar marcação: ${error.message}`)
  await registarAuditoria('booking.create', {
    table: 'bookings', recordId: (booking as { id?: string } | null)?.id ?? null,
  })
  return booking
}

// Reagenda uma marcação: actualiza datas e substitui os recursos associados
export async function reagendarBooking(
  bookingId: string,
  input: ReagendarBookingInput
) {
  const supabase = createClient()

  // RPC transacional: verifica conflito (excluindo a própria marcação) e
  // substitui os recursos na mesma transacção — a marcação nunca fica sem recursos
  const { data: booking, error } = await supabase.rpc('reschedule_booking', {
    p_booking_id:   bookingId,
    p_start_at:     input.start_at,
    p_end_at:       input.end_at,
    p_resource_ids: input.resource_ids,
    p_notes:        input.notes ?? null,
  })

  if (error) throw new Error(`Erro ao reagendar marcação: ${error.message}`)
  await registarAuditoria('booking.reschedule', { table: 'bookings', recordId: bookingId })
  return booking
}

// Actualiza o status de uma marcação (confirmar, cancelar, marcar como concluída, etc.)
export async function atualizarStatusBooking(
  bookingId: string,
  input: AtualizarStatusInput
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('bookings')
    .update({
      status:              input.status,
      cancellation_reason: input.cancellation_reason ?? null,
      cancelled_at:        input.status === 'cancelled' ? new Date().toISOString() : null,
    })
    .eq('id', bookingId)
    .select()
    .single()

  if (error) throw new Error(`Erro ao actualizar marcação: ${error.message}`)
  if (input.status === 'cancelled') {
    await registarAuditoria('booking.cancel', { table: 'bookings', recordId: bookingId })
  }
  return data
}

// Define o estado de PAGAMENTO de uma marcação (controlo de caixa).
// Ao marcar 'paid', o trigger fn_booking_payment_to_income (0029) cria 1 receita
// automaticamente (sem duplicar). O front-desk (owner/manager/recepção) pode marcar.
export async function definirPagamentoBooking(bookingId: string, input: AtualizarPagamentoInput) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('bookings')
    .update({
      payment_status: input.payment_status,
      amount_paid:    input.amount_paid ?? undefined,
    })
    .eq('id', bookingId)
    .select('id')
  if (error) throw new Error(`Erro ao actualizar pagamento: ${error.message}`)
  if (!data?.length) throw new Error('Marcação não encontrada ou sem permissão.')
  await registarAuditoria('booking.payment', {
    table: 'bookings', recordId: bookingId, metadata: { payment_status: input.payment_status },
  })
}
