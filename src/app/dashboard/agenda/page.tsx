'use client'
import React, { useState }  from 'react'
import { Plus, Clock, Calendar } from 'lucide-react'
import PageHeader       from '@/components/design-system/PageHeader/PageHeader'
import { Button }       from '@/components/design-system/Button/Button'
import SectionHeader    from '@/components/design-system/SectionHeader/SectionHeader'
import MobileCardList   from '@/components/design-system/MobileCardList/MobileCardList'
import DataTableWrapper from '@/components/design-system/DataTableWrapper/DataTableWrapper'
import Badge            from '@/components/design-system/Badge/Badge'
import StatTile         from '@/components/design-system/StatTile/StatTile'
import LoadingState     from '@/components/design-system/LoadingState/LoadingState'
import EmptyState       from '@/components/design-system/EmptyState/EmptyState'
import ErrorState       from '@/components/design-system/ErrorState/ErrorState'
import { NovaBookingModal }    from '@/components/features/agenda/NovaBookingModal'
import { ListaEsperaModal }     from '@/components/features/agenda/ListaEsperaModal'
import { CancelarBookingModal } from '@/components/features/agenda/CancelarBookingModal'
import { ReagendarBookingModal } from '@/components/features/agenda/ReagendarBookingModal'
import { AgendaCalendario }     from '@/components/features/agenda/AgendaCalendario'
import { EnviarTemplateWhatsApp } from '@/components/features/agenda/EnviarTemplateWhatsApp'
import { PagamentoBadge } from '@/components/features/agenda/PagamentoBadge'
import { PAYMENT_STATUS_LABELS, type BookingPaymentStatus } from '@/types/domain/financas'
import { rotularClienteBooking } from '@/lib/agenda/cliente-label'
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

  const [vista,             setVista]             = useState<'lista' | 'calendario'>('lista')
  const [activeFilter,      setActiveFilter]      = useState<BookingStatus | 'todos'>('todos')
  const [novaBookingAberta, setNovaBookingAberta]  = useState(false)
  const [listaEsperaAberta, setListaEsperaAberta]  = useState(false)
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

  // Resumo rápido (cartões): hoje, próximos 7 dias, pendentes
  const agora = new Date()
  const seteDias = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000)
  const proximos7 = lista.filter((b) => {
    const t = new Date(b.start_at)
    return t >= agora && t <= seteDias && b.status !== 'cancelled'
  }).length
  const pendentes = lista.filter((b) => b.status === 'pending').length
  const concluidasHoje = todayBookings.filter((b) => b.status === 'completed').length

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
  const bookingItems = filtered.map((booking) => {
    const rot = rotularClienteBooking(booking.client)
    return {
      id:          booking.id,
      title:       booking.service?.name ?? '—',
      subtitle:    rot.badge ? `${rot.nome} · ${rot.badge}` : rot.nome,
      description: `${booking.resources?.[0]?.name ?? '—'} • ${formatarDataHora(booking.start_at)} • € ${PAYMENT_STATUS_LABELS[(booking.payment_status as BookingPaymentStatus) ?? 'pending']}`,
      icon:        <Clock className="w-4 h-4 text-gray-400" />,
      action: (
        <Badge variant={STATUS_BADGE_VARIANT[booking.status]}>
          {STATUS_LABELS[booking.status]}
        </Badge>
      ),
    }
  })

  // Tabela desktop
  const tableColumns = [
    { key: 'servico', label: 'Serviço',   width: '20%' },
    { key: 'cliente', label: 'Cliente',   width: '18%' },
    { key: 'recurso', label: 'Recurso',   width: '15%' },
    { key: 'data',    label: 'Data/Hora', width: '15%' },
    { key: 'estado',  label: 'Estado e Acções', width: '32%' },
  ]

  const tableRows = filtered.map((booking) => {
    const rot = rotularClienteBooking(booking.client)
    return {
    servico: booking.service?.name ?? '—',
    cliente: (
      <span className="inline-flex items-center gap-1.5">
        <span className={rot.isQuick ? 'text-gray-500 italic' : ''}>{rot.nome}</span>
        {rot.badge && <Badge variant={rot.variant}>{rot.badge}</Badge>}
      </span>
    ),
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
  }})

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Gerencie as suas marcações"
        action={
          <div className="flex gap-2">
            <Button
              size="md"
              variant="outline"
              className="gap-2"
              onClick={() => setListaEsperaAberta(true)}
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Lista de espera</span>
            </Button>
            <Button
              size="md"
              className="gap-2"
              onClick={() => setNovaBookingAberta(true)}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Marcação</span>
            </Button>
          </div>
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
      {/* Resumo rápido em vidro */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatTile label="Hoje" value={todayBookings.length} hint="Marcações de hoje" icon={<Calendar className="w-4 h-4" />} valueClassName="text-[color:var(--tenant-primary)]" />
        <StatTile label="Próximos 7 dias" value={proximos7} hint="Agenda da semana" icon={<Clock className="w-4 h-4" />} />
        <StatTile label="Pendentes" value={pendentes} hint="A aguardar confirmação" valueClassName={pendentes > 0 ? 'text-amber-600' : undefined} />
        <StatTile label="Concluídas hoje" value={concluidasHoje} hint="Já realizadas" valueClassName="text-emerald-600" />
      </div>

      {/* Alternar Lista / Calendário */}
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex gap-1 p-1 rounded-lg bg-slate-100">
          {([
            { v: 'lista',      l: 'Lista' },
            { v: 'calendario', l: 'Calendário' },
          ] as const).map((o) => (
            <button
              key={o.v}
              onClick={() => setVista(o.v)}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                vista === o.v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {o.l}
            </button>
          ))}
        </div>
      </div>

      {vista === 'calendario' ? (
        <AgendaCalendario
          bookings={lista}
          timezone={timezone}
          statusLabels={STATUS_LABELS}
          statusVariant={STATUS_BADGE_VARIANT}
          acoes={(b) => (
            <AcoesMarcacao
              booking={b}
              atualizarStatus={atualizarStatus}
              onCancelar={setBookingCancelar}
              onReagendar={setBookingReagendar}
              channelAtivo={channelAtivo}
              podeEnviarTemplate={podeEnviarTemplate}
              podePagamento={podePagamento}
            />
          )}
        />
      ) : (
      <>
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
      <div className="sm:hidden bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm p-4">
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
      </>
      )}

      {/* Modais */}
      <NovaBookingModal
        isOpen={novaBookingAberta}
        onClose={() => setNovaBookingAberta(false)}
      />

      <ListaEsperaModal
        isOpen={listaEsperaAberta}
        onClose={() => setListaEsperaAberta(false)}
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
