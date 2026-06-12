'use client'
import React, { useState }  from 'react'
import { Plus, Clock, Calendar } from 'lucide-react'
import PageHeader       from '@/components/design-system/PageHeader/PageHeader'
import { Button }       from '@/components/design-system/Button/Button'
import SectionHeader    from '@/components/design-system/SectionHeader/SectionHeader'
import MobileCardList   from '@/components/design-system/MobileCardList/MobileCardList'
import DataTableWrapper from '@/components/design-system/DataTableWrapper/DataTableWrapper'
import Badge            from '@/components/design-system/Badge/Badge'
import LoadingState     from '@/components/design-system/LoadingState/LoadingState'
import EmptyState       from '@/components/design-system/EmptyState/EmptyState'
import ErrorState       from '@/components/design-system/ErrorState/ErrorState'
import { NovaBookingModal }    from '@/components/features/agenda/NovaBookingModal'
import { CancelarBookingModal } from '@/components/features/agenda/CancelarBookingModal'
import { ReagendarBookingModal } from '@/components/features/agenda/ReagendarBookingModal'
import { EnviarTemplateWhatsApp } from '@/components/features/agenda/EnviarTemplateWhatsApp'
import { PagamentoBadge } from '@/components/features/agenda/PagamentoBadge'
import { PAYMENT_STATUS_LABELS, type BookingPaymentStatus } from '@/types/domain/financas'
import {
  useBookings,
  useAtualizarStatusBooking,
} from '@/hooks/useBookings'
import { useEstadoWhatsApp } from '@/hooks/useWhatsAppTemplates'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/providers/AuthProvider'
import type { BookingStatus, BookingWithRelations } from '@/types/domain'

// ── Rótulos e variantes de badge por status ────────────────────────────────
const STATUS_LABELS: Record<BookingStatus, string> = {
  pending:     'Pendente',
  confirmed:   'Confirmada',
  in_progress: 'Em curso',
  completed:   'Concluída',
  cancelled:   'Cancelada',
  no_show:     'Não compareceu',
}

const STATUS_BADGE_VARIANT: Record<BookingStatus, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  pending:     'warning',
  confirmed:   'success',
  in_progress: 'primary',
  completed:   'default',
  cancelled:   'error',
  no_show:     'error',
}

const FILTER_OPTIONS: Array<{ value: BookingStatus | 'todos'; label: string }> = [
  { value: 'todos',       label: 'Todos' },
  { value: 'confirmed',   label: 'Confirmadas' },
  { value: 'pending',     label: 'Pendentes' },
  { value: 'in_progress', label: 'Em curso' },
  { value: 'completed',   label: 'Concluídas' },
  { value: 'cancelled',   label: 'Canceladas' },
]

// ── Componente de acções inline por marcação ────────────────────────────────
interface AcoesProps {
  booking:         BookingWithRelations
  atualizarStatus: ReturnType<typeof useAtualizarStatusBooking>
  onCancelar:      (b: BookingWithRelations) => void
  onReagendar:     (b: BookingWithRelations) => void
  channelAtivo:    boolean
  podeEnviarTemplate: boolean
  podePagamento:   boolean
}

function AcoesMarcacao({ booking, atualizarStatus, onCancelar, onReagendar, channelAtivo, podeEnviarTemplate, podePagamento }: AcoesProps) {
  const { status } = booking
  const isPending  = atualizarStatus.isPending

  const btnBase = 'text-xs px-2 py-1 rounded font-medium transition-colors disabled:opacity-50'

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <Badge variant={STATUS_BADGE_VARIANT[status]}>
        {STATUS_LABELS[status]}
      </Badge>

      {/* Estado de pagamento (controlo de caixa) */}
      <PagamentoBadge
        bookingId={booking.id}
        status={(booking.payment_status as BookingPaymentStatus) ?? 'pending'}
        podeEditar={podePagamento}
      />

      {status === 'pending' && (
        <button
          onClick={() => atualizarStatus.mutate({ id: booking.id, input: { status: 'confirmed' } })}
          disabled={isPending}
          className={`${btnBase} bg-green-100 text-green-700 hover:bg-green-200`}
        >
          Confirmar
        </button>
      )}

      {status === 'confirmed' && (
        <button
          onClick={() => atualizarStatus.mutate({ id: booking.id, input: { status: 'in_progress' } })}
          disabled={isPending}
          className={`${btnBase} bg-blue-100 text-blue-700 hover:bg-blue-200`}
        >
          Iniciar
        </button>
      )}

      {(status === 'confirmed' || status === 'in_progress') && (
        <button
          onClick={() => atualizarStatus.mutate({ id: booking.id, input: { status: 'completed' } })}
          disabled={isPending}
          className={`${btnBase} bg-gray-100 text-gray-700 hover:bg-gray-200`}
        >
          Concluir
        </button>
      )}

      {(status === 'pending' || status === 'confirmed') && (
        <button
          onClick={() => atualizarStatus.mutate({ id: booking.id, input: { status: 'no_show' } })}
          disabled={isPending}
          className={`${btnBase} bg-orange-100 text-orange-700 hover:bg-orange-200`}
        >
          Não veio
        </button>
      )}

      {(status === 'pending' || status === 'confirmed') && (
        <button
          onClick={() => onReagendar(booking)}
          disabled={isPending}
          className={`${btnBase} bg-purple-100 text-purple-700 hover:bg-purple-200`}
        >
          Reagendar
        </button>
      )}

      {(status === 'pending' || status === 'confirmed' || status === 'in_progress') && (
        <button
          onClick={() => onCancelar(booking)}
          disabled={isPending}
          className={`${btnBase} bg-red-100 text-red-700 hover:bg-red-200`}
        >
          Cancelar
        </button>
      )}

      {/* Fase 1C — envio MANUAL de template WhatsApp (confirmação/lembrete/etc.).
          Só para quem tem conversas.reply (STAFF não vê — a API também bloqueia). */}
      {podeEnviarTemplate && (
        <EnviarTemplateWhatsApp bookingId={booking.id} channelAtivo={channelAtivo} />
      )}
    </div>
  )
}

// ── Página principal ────────────────────────────────────────────────────────
export default function AgendaPage() {
  const { tenant } = useAuth()
  const timezone   = (tenant?.settings as { timezone?: string } | null)?.timezone ?? 'Europe/Lisbon'

  const [activeFilter,      setActiveFilter]      = useState<BookingStatus | 'todos'>('todos')
  const [novaBookingAberta, setNovaBookingAberta]  = useState(false)
  const [bookingCancelar,   setBookingCancelar]    = useState<BookingWithRelations | null>(null)
  const [bookingReagendar,  setBookingReagendar]   = useState<BookingWithRelations | null>(null)

  const { data: bookings, isLoading, error, refetch } = useBookings()
  const atualizarStatus = useAtualizarStatusBooking()

  // Estado do canal WhatsApp: define se as acções de template ficam activas.
  const { data: estadoWhatsApp } = useEstadoWhatsApp()
  const channelAtivo = estadoWhatsApp?.is_active ?? false

  // Só owner/manager/receptionist enviam templates (STAFF não vê o botão).
  const { can } = usePermissions()
  const podeEnviarTemplate = can('conversas.reply')
  // Front-desk (owner/manager/receptionist) pode marcar o pagamento da marcação.
  const podePagamento = can('agenda.create')

  // Página não-refém: cabeçalho + "Nova Marcação" + modais sempre disponíveis;
  // só o corpo de dados mostra loading/erro/lista.
  const lista = bookings ?? []

  const todayBookings = lista.filter((b) => {
    const bookingDate = new Date(b.start_at).toLocaleDateString('pt-PT', { timeZone: timezone })
    const today       = new Date().toLocaleDateString('pt-PT', { timeZone: timezone })
    return bookingDate === today && b.status !== 'cancelled'
  })

  const filtered = activeFilter === 'todos'
    ? lista
    : lista.filter((b) => b.status === activeFilter)

  function formatarDataHora(iso: string) {
    return new Date(iso).toLocaleString('pt-PT', {
      timeZone: timezone,
      day:    '2-digit',
      month:  '2-digit',
      hour:   '2-digit',
      minute: '2-digit',
    })
  }

  // Cards mobile
  const bookingItems = filtered.map((booking) => ({
    id:          booking.id,
    title:       booking.service?.name ?? '—',
    subtitle:    booking.client?.full_name ?? '—',
    description: `${booking.resources?.[0]?.name ?? '—'} • ${formatarDataHora(booking.start_at)} • € ${PAYMENT_STATUS_LABELS[(booking.payment_status as BookingPaymentStatus) ?? 'pending']}`,
    icon:        <Clock className="w-4 h-4 text-gray-400" />,
    action: (
      <Badge variant={STATUS_BADGE_VARIANT[booking.status]}>
        {STATUS_LABELS[booking.status]}
      </Badge>
    ),
  }))

  // Tabela desktop
  const tableColumns = [
    { key: 'servico', label: 'Serviço',   width: '20%' },
    { key: 'cliente', label: 'Cliente',   width: '18%' },
    { key: 'recurso', label: 'Recurso',   width: '15%' },
    { key: 'data',    label: 'Data/Hora', width: '15%' },
    { key: 'estado',  label: 'Estado e Acções', width: '32%' },
  ]

  const tableRows = filtered.map((booking) => ({
    servico: booking.service?.name ?? '—',
    cliente: booking.client?.full_name ?? '—',
    recurso: booking.resources?.[0]?.name ?? '—',
    data:    formatarDataHora(booking.start_at),
    estado: (
      <AcoesMarcacao
        booking={booking}
        atualizarStatus={atualizarStatus}
        onCancelar={setBookingCancelar}
        onReagendar={setBookingReagendar}
        channelAtivo={channelAtivo}
        podeEnviarTemplate={podeEnviarTemplate}
        podePagamento={podePagamento}
      />
    ),
  }))

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Gerencie as suas marcações"
        action={
          <Button
            size="md"
            className="gap-2"
            onClick={() => setNovaBookingAberta(true)}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nova Marcação</span>
          </Button>
        }
      />

      {error ? (
        <ErrorState
          title="Erro ao carregar marcações"
          description={error instanceof Error ? error.message : 'Erro desconhecido'}
          action={<Button size="sm" onClick={() => void refetch()}>Tentar novamente</Button>}
        />
      ) : isLoading ? (
        <LoadingState message="A carregar marcações..." />
      ) : (
      <>
      {/* Alerta de hoje */}
      {todayBookings.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-blue-900">
            {todayBookings.length} marcação(ões) para hoje
          </p>
        </div>
      )}

      {/* Filtros por estado */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setActiveFilter(opt.value)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeFilter === opt.value
                ? 'bg-[color:var(--tenant-primary)] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Lista mobile */}
      <div className="sm:hidden bg-white rounded-lg border border-gray-200 p-4">
        <SectionHeader title={`${filtered.length} marcação(ões)`} />
        {filtered.length > 0 ? (
          <MobileCardList items={bookingItems} />
        ) : (
          <EmptyState
            icon={<Calendar className="w-12 h-12" />}
            title="Nenhuma marcação"
            description="Sem marcações com o filtro seleccionado"
            action={
              <Button size="sm" onClick={() => setNovaBookingAberta(true)}>
                <Plus className="w-4 h-4 mr-1" /> Nova Marcação
              </Button>
            }
          />
        )}
      </div>

      {/* Tabela desktop */}
      <div className="hidden sm:block">
        {filtered.length > 0 ? (
          <DataTableWrapper columns={tableColumns} rows={tableRows} />
        ) : (
          <EmptyState
            icon={<Calendar className="w-12 h-12" />}
            title="Nenhuma marcação"
            description="Sem marcações com o filtro seleccionado"
            action={
              <Button size="sm" onClick={() => setNovaBookingAberta(true)}>
                <Plus className="w-4 h-4 mr-1" /> Nova Marcação
              </Button>
            }
          />
        )}
      </div>
      </>
      )}

      {/* Modais */}
      <NovaBookingModal
        isOpen={novaBookingAberta}
        onClose={() => setNovaBookingAberta(false)}
      />

      {bookingCancelar && (
        <CancelarBookingModal
          isOpen={!!bookingCancelar}
          onClose={() => setBookingCancelar(null)}
          bookingId={bookingCancelar.id}
          descricao={`${bookingCancelar.service?.name ?? '?'} — ${bookingCancelar.client?.full_name ?? '?'}`}
        />
      )}

      {bookingReagendar && (
        <ReagendarBookingModal
          isOpen={!!bookingReagendar}
          onClose={() => setBookingReagendar(null)}
          booking={bookingReagendar}
        />
      )}
    </div>
  )
}
