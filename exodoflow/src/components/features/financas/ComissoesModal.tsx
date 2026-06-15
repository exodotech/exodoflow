'use client'
// Modal de Comissões — quanto pagar a cada profissional num período.
// Base: marcações concluídas. Controlo interno (não é folha de salários oficial).
import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, Percent } from 'lucide-react'
import { Modal } from '@/components/design-system/Modal/Modal'
import { relatorioComissoes } from '@/services/comissoes'
import { formatCurrencyByCode } from '@/lib/i18n/currency'
import type { SupportedLocale } from '@/types/domain'

interface Props {
  isOpen:   boolean
  onClose:  () => void
  currency: string
  locale:   SupportedLocale
  mesAtual: string   // YYYY-MM (mês corrente no fuso do tenant)
}

export function ComissoesModal({ isOpen, onClose, currency, locale, mesAtual }: Props) {
  const [from, setFrom] = useState(`${mesAtual}-01`)
  const [to, setTo]     = useState(fimDoMes(mesAtual))

  const { data: linhas = [], isLoading, error } = useQuery({
    queryKey: ['comissoes', from, to],
    queryFn: () => relatorioComissoes(from, to),
    enabled: isOpen && !!from && !!to && from <= to,
  })

  const fmt = (v: number) => formatCurrencyByCode(v, currency, locale)
  const totalGeral = linhas.reduce((acc, l) => acc + l.total_comissao, 0)
  const inputCls = 'h-9 px-2 rounded-lg border border-gray-300 text-sm text-gray-700 bg-white focus:outline-none focus:border-[color:var(--tenant-primary)]'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Comissões por profissional" size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-gray-500">De
            <input type="date" className={`${inputCls} block mt-0.5`} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-xs text-gray-500">Até
            <input type="date" className={`${inputCls} block mt-0.5`} value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>

        {error ? (
          <p className="text-sm text-red-600">{(error as Error).message}</p>
        ) : isLoading ? (
          <p className="text-sm text-gray-400 italic py-6 text-center">A calcular…</p>
        ) : linhas.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-600">Sem serviços concluídos neste período.</p>
            <p className="text-xs text-gray-400 mt-1">Defina a comissão de cada colaborador em Recursos.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                    <th className="py-2 pr-2">Profissional</th>
                    <th className="py-2 px-2 text-center">%</th>
                    <th className="py-2 px-2 text-center">Serviços</th>
                    <th className="py-2 px-2 text-right">Faturado</th>
                    <th className="py-2 pl-2 text-right">Comissão</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l) => (
                    <tr key={l.resource_id} className="border-b border-gray-50">
                      <td className="py-2 pr-2 font-medium text-gray-900">{l.resource_name}</td>
                      <td className="py-2 px-2 text-center text-gray-500">{l.commission_percent}%</td>
                      <td className="py-2 px-2 text-center text-gray-700 tabular-nums">{l.total_servicos}</td>
                      <td className="py-2 px-2 text-right text-gray-700 tabular-nums">{fmt(l.total_faturado)}</td>
                      <td className="py-2 pl-2 text-right font-semibold text-gray-900 tabular-nums">{fmt(l.total_comissao)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="py-2 pr-2 text-right text-sm font-medium text-gray-600">Total a pagar</td>
                    <td className="py-2 pl-2 text-right text-base font-bold text-[color:var(--tenant-primary)] tabular-nums">{fmt(totalGeral)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="text-[11px] text-gray-400 flex items-center gap-1">
              <Percent className="w-3 h-3" /> Base: marcações concluídas no período. Controlo interno — não é folha de salários oficial.
            </p>
          </>
        )}
      </div>
    </Modal>
  )
}

// Último dia do mês YYYY-MM em formato YYYY-MM-DD.
function fimDoMes(mes: string): string {
  const [y, m] = mes.split('-').map(Number)
  const ultimo = new Date(y, m, 0).getDate()
  return `${mes}-${String(ultimo).padStart(2, '0')}`
}
