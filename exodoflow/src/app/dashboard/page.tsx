'use client'
import React from 'react'
import Link from 'next/link'
import { BarChart3, Users, Calendar, TrendingUp, AlertCircle } from 'lucide-react'
import PageHeader    from '@/components/design-system/PageHeader/PageHeader'
import StatCard      from '@/components/design-system/StatCard/StatCard'
import SectionHeader from '@/components/design-system/SectionHeader/SectionHeader'
import { Button }    from '@/components/design-system/Button/Button'
import MobileCardList from '@/components/design-system/MobileCardList/MobileCardList'
import Badge          from '@/components/design-system/Badge/Badge'
import LoadingState   from '@/components/design-system/LoadingState/LoadingState'
import ErrorState    from '@/components/design-system/ErrorState/ErrorState'
import { useBookings }  from '@/hooks/useBookings'
import { useClientes }  from '@/hooks/useClientes'
import { useAuth }      from '@/providers/AuthProvider'
import { formatCurrencyByCode }        from '@/lib/i18n/currency'
import { DEFAULT_LOCALE }              from '@/lib/i18n/locale'
import type { SupportedLocale }        from '@/types/domain/communication'
import type { TenantSettings }         from '@/types/domain/tenant'
import type { BookingStatus }          from '@/types/domain'

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending:     'Pendente',
  confirmed:   'Confirmada',
  in_progress: 'Em curso',
  completed:   'Concluída',
  cancelled:   'Cancelada',
  no_show:     'Não apareceu',
}

const STATUS_BADGE_VARIANT: Record<BookingStatus, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  pending:     'warning',
  confirmed:   'success',
  in_progress: 'primary',
  completed:   'default',
  cancelled:   'error',
  no_show:     'error',
}

export default function DashboardPage() {
  const { tenant } = useAuth()
  const { data: bookings, isLoading: loadingBookings, error: erroBookings, refetch: refetchBookings } = useBookings()
  const { data: clientes, isLoading: loadingClientes, error: erroClientes } = useClientes()

  // A página NÃO é refém das queries: o cabeçalho aparece sempre; o corpo mostra
  // loading/erro/dados. A sidebar (com Sair) está sempre disponível no layout.
  const carregando = loadingBookings || loadingClientes
  const erro        = erroBookings ?? erroClientes

  const lista        = bookings ?? []
  const listaClientes = clientes ?? []

  // Marcações futuras para o painel de próximas marcações
  const upcomingBookings = lista
    .filter((b) => new Date(b.start_at) > new Date() && b.status !== 'cancelled')
    .slice(0, 3)

  // Alertas operacionais — só dados reais
  const pendingBookings = lista.filter((b) => b.status === 'pending')

  // Marcações de hoje (qualquer status excepto cancelado)
  const inicioHoje = new Date()
  inicioHoje.setHours(0, 0, 0, 0)
  const fimHoje = new Date()
  fimHoje.setHours(23, 59, 59, 999)
  const agendamentosHoje = lista.filter(
    (b) =>
      new Date(b.start_at) >= inicioHoje &&
      new Date(b.start_at) <= fimHoje &&
      b.status !== 'cancelled'
  ).length

  // Receita estimada nos últimos 30 dias — soma do preço dos serviços de bookings confirmed/completed
  // Se o serviço não tiver preço registado, não conta (não inventar valor)
  const trintaDiasAtras = new Date()
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)
  const receita30Dias = lista
    .filter(
      (b) =>
        (b.status === 'confirmed' || b.status === 'completed') &&
        new Date(b.start_at) >= trintaDiasAtras &&
        b.service?.price != null
    )
    .reduce((soma, b) => soma + (b.service?.price ?? 0), 0)

  // Cast necessário: settings é armazenado como JSONB (Json do Supabase), mas segue a interface TenantSettings
  const tenantSettings = tenant?.settings as TenantSettings | null | undefined
  const currency = tenantSettings?.currency ?? 'EUR'
  const locale: SupportedLocale = tenantSettings?.locale ?? DEFAULT_LOCALE
  const receitaFormatada =
    receita30Dias === 0
      ? '—'
      : formatCurrencyByCode(receita30Dias, currency, locale)

  const bookingItems = upcomingBookings.map((booking) => ({
    id:          booking.id,
    title:       booking.service?.name ?? '—',
    subtitle:    booking.client?.full_name ?? '—',
    description: `${booking.resources?.[0]?.name ?? '—'} • ${new Date(booking.start_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`,
    action: (
      <Badge variant={STATUS_BADGE_VARIANT[booking.status]}>
        {STATUS_LABELS[booking.status]}
      </Badge>
    ),
  }))

  return (
    <div>
      <PageHeader
        title={`Bem-vindo${tenant ? `, ${tenant.name}` : ''}!`}
        description="Visão geral do seu negócio"
      />

      {erro ? (
        <ErrorState
          title="Erro ao carregar dados do dashboard."
          description={erro.message}
          action={<Button size="sm" onClick={() => void refetchBookings()}>Tentar novamente</Button>}
        />
      ) : carregando ? (
        <LoadingState message="A carregar dados..." />
      ) : (
      <>
      {/* Alertas operacionais — apenas dados reais */}
      {pendingBookings.length > 0 && (
        <div className="space-y-2 mb-6">
          <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900">
                {pendingBookings.length} marcação(ões) por confirmar
              </p>
              <p className="text-xs text-yellow-700 mt-0.5">
                Reveja e confirme as marcações pendentes
              </p>
            </div>
            <Link href="/dashboard/agenda">
              <Button size="sm" variant="outline">Ver</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Stats — todos com dados reais; valores sem dados mostram "—" */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Receita (30 dias)"
          value={receitaFormatada}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          label="Marcações hoje"
          value={agendamentosHoje}
          icon={<Calendar className="w-5 h-5" />}
        />
        <StatCard
          label="Clientes"
          value={listaClientes.length}
          icon={<Users className="w-5 h-5" />}
        />
        {/* Taxa de ocupação requer histórico de slots disponíveis — mostrará "—" até existir esse cálculo */}
        <StatCard
          label="Taxa de ocupação"
          value="—"
          icon={<BarChart3 className="w-5 h-5" />}
          description="Disponível quando houver histórico suficiente."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximas Marcações — dados reais */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <SectionHeader
            title="Próximas Marcações"
            action={
              <Link href="/dashboard/agenda">
                <Button size="sm" variant="ghost">Ver todas</Button>
              </Link>
            }
          />
          {upcomingBookings.length > 0 ? (
            <MobileCardList items={bookingItems} />
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              Nenhuma marcação próxima
            </p>
          )}
        </div>

        {/* Conversas WhatsApp — integração ainda não ativada */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <SectionHeader
            title="Conversas WhatsApp"
            action={
              <Link href="/dashboard/conversas">
                <Button size="sm" variant="ghost">Ver todas</Button>
              </Link>
            }
          />
          <div className="text-center py-8 space-y-1">
            <p className="text-sm text-gray-500">Nenhuma conversa real ainda.</p>
            <p className="text-xs text-gray-400">Integração WhatsApp ainda não ativada.</p>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  )
}
