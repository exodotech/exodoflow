'use client'
// Estado de pagamento de uma marcação (controlo de caixa) — badge + dropdown.
// Marcar 'paid' dispara (no servidor) a criação automática de 1 receita.
import { useState, useRef, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import Badge from '@/components/design-system/Badge/Badge'
import { useDefinirPagamento } from '@/hooks/useBookings'
import { PAYMENT_STATUS_LABELS, type BookingPaymentStatus } from '@/types/domain/financas'

const VARIANT: Record<BookingPaymentStatus, 'success' | 'warning' | 'primary' | 'default'> = {
  paid:             'success',
  pending:          'warning',
  partial:          'primary',
  cancelled_unpaid: 'default',
}

// Opções oferecidas no dropdown (cancelled_unpaid é mostrado mas raramente usado).
const OPCOES: BookingPaymentStatus[] = ['pending', 'paid', 'partial', 'cancelled_unpaid']

interface Props {
  bookingId:  string
  status:     BookingPaymentStatus
  podeEditar: boolean
}

export function PagamentoBadge({ bookingId, status, podeEditar }: Props) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const definir = useDefinirPagamento()

  useEffect(() => {
    if (!aberto) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [aberto])

  const badge = (
    <Badge variant={VARIANT[status]}>
      {definir.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : `€ ${PAYMENT_STATUS_LABELS[status]}`}
    </Badge>
  )

  if (!podeEditar) return badge

  function escolher(novo: BookingPaymentStatus) {
    setAberto(false)
    if (novo !== status) definir.mutate({ id: bookingId, input: { payment_status: novo } })
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button type="button" onClick={() => setAberto((v) => !v)} disabled={definir.isPending} aria-haspopup="menu" aria-expanded={aberto}>
        {badge}
      </button>
      {aberto && (
        <div role="menu" className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {OPCOES.map((o) => (
            <button
              key={o}
              role="menuitem"
              type="button"
              onClick={() => escolher(o)}
              className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 ${o === status ? 'font-semibold text-gray-900' : 'text-gray-600'}`}
            >
              {PAYMENT_STATUS_LABELS[o]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
