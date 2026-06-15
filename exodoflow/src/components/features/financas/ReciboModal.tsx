'use client'
// Modal de Recibo — emite (RPC numerada) e mostra o comprovativo imprimível.
// A impressão abre uma janela isolada com HTML auto-contido (não polui o CSS da app).
import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Printer, ReceiptText, FileCheck2 } from 'lucide-react'
import { Modal }  from '@/components/design-system/Modal/Modal'
import { Button } from '@/components/design-system/Button/Button'
import { getReciboPorTransacao, emitirRecibo } from '@/services/recibos'
import { formatCurrencyByCode } from '@/lib/i18n/currency'
import { paymentMethodLabel, reciboNumero, type Receipt, type FinancialTransaction } from '@/types/domain/financas'
import type { SupportedLocale } from '@/types/domain'

interface Props {
  isOpen:    boolean
  onClose:   () => void
  transacao: FinancialTransaction
  locale:    SupportedLocale
}

export function ReciboModal({ isOpen, onClose, transacao, locale }: Props) {
  const qc = useQueryClient()
  const key = ['recibo', transacao.id] as const

  const { data: recibo, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => getReciboPorTransacao(transacao.id),
    enabled: isOpen,
  })

  const emitir = useMutation({
    mutationFn: () => emitirRecibo(transacao.id),
    onSuccess: (r) => { qc.setQueryData(key, r); void qc.invalidateQueries({ queryKey: ['recibos'] }) },
  })

  const fmt = (v: number) => formatCurrencyByCode(v, transacao.currency, locale)
  const fmtData = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Recibo de pagamento"
      size="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
          {recibo ? (
            <Button size="sm" onClick={() => imprimirRecibo(recibo, locale)}>
              <Printer className="w-4 h-4" /> Imprimir
            </Button>
          ) : (
            <Button size="sm" onClick={() => emitir.mutate()} isLoading={emitir.isPending} disabled={emitir.isPending || isLoading}>
              <FileCheck2 className="w-4 h-4" /> Emitir recibo
            </Button>
          )}
        </>
      }
    >
      {isLoading ? (
        <p className="text-sm text-gray-400 italic py-6 text-center">A carregar…</p>
      ) : recibo ? (
        <ReciboView recibo={recibo} fmt={fmt} fmtData={fmtData} />
      ) : (
        <div className="text-center py-6">
          <ReceiptText className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-600">
            Ainda não foi emitido recibo para este pagamento de <strong>{fmt(transacao.amount)}</strong>.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Ao emitir, é atribuído um número sequencial. Comprovativo interno — não é fatura certificada.
          </p>
          {emitir.isError && <p className="text-xs text-red-600 mt-2">{(emitir.error as Error).message}</p>}
        </div>
      )}
    </Modal>
  )
}

// Visualização do recibo dentro do modal (espelha a impressão).
function ReciboView({ recibo, fmt, fmtData }: { recibo: Receipt; fmt: (v: number) => string; fmtData: (iso: string) => string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-800">
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
        <div>
          <p className="font-semibold text-gray-900">{recibo.issuer_name}</p>
          {recibo.issuer_tax_id && <p className="text-xs text-gray-500">Contribuinte: {recibo.issuer_tax_id}</p>}
          {recibo.issuer_address && <p className="text-xs text-gray-500">{recibo.issuer_address}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-gray-400">Recibo Nº</p>
          <p className="font-mono font-semibold text-gray-900">{reciboNumero(recibo)}</p>
          <p className="text-xs text-gray-500">{fmtData(recibo.issued_at)}</p>
        </div>
      </div>

      <div className="py-3 border-b border-gray-100">
        <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Recebido de</p>
        <p className="font-medium text-gray-900">{recibo.client_name ?? 'Cliente não identificado'}</p>
        {recibo.client_tax_id && <p className="text-xs text-gray-500">Contribuinte: {recibo.client_tax_id}</p>}
      </div>

      <div className="py-3">
        {recibo.description && <p className="text-gray-700 mb-2">{recibo.description}</p>}
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Método: {paymentMethodLabel(recibo.payment_method)}</span>
          <span className="text-lg font-bold text-gray-900">{fmt(recibo.amount)}</span>
        </div>
      </div>

      <p className="text-[11px] text-gray-400 pt-3 border-t border-gray-100">
        Comprovativo de pagamento. Não é fatura certificada.
      </p>
    </div>
  )
}

// Abre janela isolada e imprime (HTML auto-contido, sem depender do CSS da app).
function imprimirRecibo(r: Receipt, locale: SupportedLocale) {
  const fmt = (v: number) => formatCurrencyByCode(v, r.currency, locale)
  const data = new Date(r.issued_at).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
  const esc = (s: string | null) => (s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!))
  const linha = (l: string, v: string) => v ? `<p style="margin:2px 0;color:#555;font-size:12px">${l}${v}</p>` : ''

  const html = `<!doctype html><html lang="pt"><head><meta charset="utf-8">
<title>Recibo ${reciboNumero(r)}</title>
<style>
  *{box-sizing:border-box} body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1f2937;margin:0;padding:32px;max-width:480px}
  .row{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
  .sep{border-top:1px solid #e5e7eb;margin:14px 0}
  .label{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#9ca3af;margin:0 0 2px}
  .num{font-family:ui-monospace,Menlo,monospace;font-weight:600}
  .total{font-size:20px;font-weight:700}
  .foot{font-size:11px;color:#9ca3af;margin-top:14px}
  @media print{body{padding:0}}
</style></head><body onload="window.print()">
  <div class="row">
    <div>
      <p style="font-weight:600;margin:0">${esc(r.issuer_name)}</p>
      ${linha('Contribuinte: ', esc(r.issuer_tax_id))}
      ${linha('', esc(r.issuer_address))}
    </div>
    <div style="text-align:right">
      <p class="label">Recibo Nº</p>
      <p class="num" style="margin:0">${reciboNumero(r)}</p>
      <p style="font-size:12px;color:#6b7280;margin:2px 0 0">${data}</p>
    </div>
  </div>
  <div class="sep"></div>
  <p class="label">Recebido de</p>
  <p style="font-weight:500;margin:0">${esc(r.client_name) || 'Cliente não identificado'}</p>
  ${linha('Contribuinte: ', esc(r.client_tax_id))}
  <div class="sep"></div>
  ${r.description ? `<p style="margin:0 0 10px">${esc(r.description)}</p>` : ''}
  <div class="row">
    <span style="color:#6b7280">Método: ${esc(paymentMethodLabel(r.payment_method))}</span>
    <span class="total">${fmt(r.amount)}</span>
  </div>
  <div class="sep"></div>
  <p class="foot">Comprovativo de pagamento. Não é fatura certificada.</p>
</body></html>`

  const w = window.open('', '_blank', 'width=480,height=680')
  if (!w) { alert('Permita pop-ups para imprimir o recibo.'); return }
  w.document.write(html)
  w.document.close()
}
