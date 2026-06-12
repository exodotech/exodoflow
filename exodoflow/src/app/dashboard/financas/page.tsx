'use client'
// /dashboard/financas — controlo interno de caixa (OWNER + MANAGER).
// NÃO é contabilidade oficial nem faturação certificada. Mobile-first.
import React, { useMemo, useState } from 'react'
import { Plus, Minus, Download, Pencil, Trash2, Wallet, Clock } from 'lucide-react'
import PageHeader       from '@/components/design-system/PageHeader/PageHeader'
import { Button }       from '@/components/design-system/Button/Button'
import { StatCard }     from '@/components/design-system/StatCard/StatCard'
import Badge            from '@/components/design-system/Badge/Badge'
import SectionHeader    from '@/components/design-system/SectionHeader/SectionHeader'
import MobileCardList   from '@/components/design-system/MobileCardList/MobileCardList'
import DataTableWrapper from '@/components/design-system/DataTableWrapper/DataTableWrapper'
import LoadingState     from '@/components/design-system/LoadingState/LoadingState'
import EmptyState       from '@/components/design-system/EmptyState/EmptyState'
import ErrorState       from '@/components/design-system/ErrorState/ErrorState'
import ConfirmDialog    from '@/components/design-system/ConfirmDialog/ConfirmDialog'
import AccessDenied     from '@/components/design-system/AccessDenied/AccessDenied'
import { TransacaoModal } from '@/components/features/financas/TransacaoModal'
import { useTransacoes, useApagarTransacao } from '@/hooks/useFinancas'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/providers/AuthProvider'
import { calcularResumo, gerarCSVTransacoes } from '@/lib/financas/resumo'
import { formatCurrencyByCode } from '@/lib/i18n/currency'
import {
  INCOME_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS,
  categoryLabel, paymentMethodLabel,
  type FinancialType, type FinancialTransaction,
} from '@/types/domain/financas'
import type { SupportedLocale } from '@/types/domain'
import type { FiltrosFinancas } from '@/services/financas'

const SELECT_CLS = 'h-9 px-2 rounded-lg border border-gray-300 text-sm text-gray-700 bg-white focus:outline-none focus:border-[color:var(--tenant-primary)]'

export default function FinancasPage() {
  const { can } = usePermissions()
  const { tenant } = useAuth()

  const settings = (tenant?.settings ?? {}) as { currency?: string; locale?: SupportedLocale; timezone?: string }
  const currency = settings.currency ?? 'EUR'
  const locale   = settings.locale   ?? 'pt-PT'
  const timezone = settings.timezone ?? 'Europe/Lisbon'

  // Hoje e início do mês no fuso do tenant (en-CA → YYYY-MM-DD)
  const hoje      = new Date().toLocaleDateString('en-CA', { timeZone: timezone })
  const inicioMes = `${hoje.slice(0, 7)}-01`

  const [filtros, setFiltros]   = useState<FiltrosFinancas>({})
  const [novoTipo, setNovoTipo] = useState<FinancialType | null>(null)
  const [editar, setEditar]     = useState<FinancialTransaction | null>(null)
  const [apagar, setApagar]     = useState<FinancialTransaction | null>(null)

  // Resumo: sempre o MÊS corrente (independente dos filtros da lista)
  const { data: doMes = [] } = useTransacoes({ from: inicioMes })
  const resumo = useMemo(() => calcularResumo(doMes, hoje), [doMes, hoje])

  // Lista filtrável
  const { data: lista = [], isLoading, error, refetch } = useTransacoes(filtros)
  const apagarMut = useApagarTransacao()

  const fmt = (v: number) => formatCurrencyByCode(v, currency, locale)

  if (!can('financas.view')) {
    return <AccessDenied description="As finanças são reservadas ao proprietário e ao gestor da conta." />
  }

  function exportarCSV() {
    const csv  = gerarCSVTransacoes(lista)
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `financas-${hoje}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function setFiltro<K extends keyof FiltrosFinancas>(k: K, v: FiltrosFinancas[K]) {
    setFiltros((f) => ({ ...f, [k]: v || undefined }))
  }

  // Linhas para lista mobile / tabela desktop
  const linhas = lista.map((t) => {
    const entrada = t.type === 'income'
    return {
      id:    t.id,
      data:  t.transaction_date,
      tipo:  <Badge variant={entrada ? 'success' : 'error'}>{entrada ? 'Entrada' : 'Saída'}</Badge>,
      categoria: categoryLabel(t.category),
      valor: <span className={entrada ? 'text-emerald-700 font-medium' : 'text-red-700 font-medium'}>{entrada ? '+' : '−'} {fmt(t.amount)}</span>,
      metodo: paymentMethodLabel(t.payment_method),
      acoes: (
        <div className="flex items-center gap-1">
          <button onClick={() => setEditar(t)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Editar"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => setApagar(t)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Apagar"><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    }
  })

  const mobileItems = lista.map((t) => {
    const entrada = t.type === 'income'
    return {
      id:          t.id,
      title:       categoryLabel(t.category),
      subtitle:    `${t.transaction_date} • ${paymentMethodLabel(t.payment_method)}`,
      description: t.description ?? undefined,
      icon:        entrada ? <Plus className="w-4 h-4 text-emerald-500" /> : <Minus className="w-4 h-4 text-red-500" />,
      action:      <span className={entrada ? 'text-emerald-700 font-semibold text-sm' : 'text-red-700 font-semibold text-sm'}>{entrada ? '+' : '−'} {fmt(t.amount)}</span>,
    }
  })

  const colunas = [
    { key: 'data',      label: 'Data',      width: '14%' },
    { key: 'tipo',      label: 'Tipo',      width: '12%' },
    { key: 'categoria', label: 'Categoria', width: '24%' },
    { key: 'valor',     label: 'Valor',     width: '18%' },
    { key: 'metodo',    label: 'Método',    width: '18%' },
    { key: 'acoes',     label: '',          width: '14%' },
  ]

  return (
    <div>
      <PageHeader
        title="Finanças"
        description="Controlo interno de caixa — entradas, saídas e saldo. Não é faturação oficial."
        action={
          <div className="flex gap-2">
            <Button size="md" className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => setNovoTipo('income')}>
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Entrada</span>
            </Button>
            <Button size="md" variant="outline" className="gap-1 border-red-300 text-red-700 hover:bg-red-50" onClick={() => setNovoTipo('expense')}>
              <Minus className="w-4 h-4" /> <span className="hidden sm:inline">Saída</span>
            </Button>
          </div>
        }
      />

      {/* Resumo do dia */}
      <SectionHeader title="Hoje" />
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Entradas" value={fmt(resumo.entradasDia)} icon={<Plus className="w-4 h-4" />} />
        <StatCard label="Saídas"   value={fmt(resumo.saidasDia)}   icon={<Minus className="w-4 h-4" />} />
        <StatCard label="Saldo"    value={fmt(resumo.saldoDia)}    icon={<Wallet className="w-4 h-4" />} />
      </div>

      {/* Resumo do mês */}
      <SectionHeader title="Este mês" />
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Entradas" value={fmt(resumo.entradasMes)} />
        <StatCard label="Saídas"   value={fmt(resumo.saidasMes)} />
        <StatCard label="Saldo"    value={fmt(resumo.saldoMes)} />
      </div>

      {/* Filtros + exportar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input type="date" className={SELECT_CLS} value={filtros.from ?? ''} onChange={(e) => setFiltro('from', e.target.value)} aria-label="De" />
        <input type="date" className={SELECT_CLS} value={filtros.to ?? ''} onChange={(e) => setFiltro('to', e.target.value)} aria-label="Até" />
        <select className={SELECT_CLS} value={filtros.type ?? 'all'} onChange={(e) => setFiltro('type', e.target.value as FiltrosFinancas['type'])}>
          <option value="all">Todos os tipos</option>
          <option value="income">Entradas</option>
          <option value="expense">Saídas</option>
        </select>
        <select className={SELECT_CLS} value={filtros.category ?? ''} onChange={(e) => setFiltro('category', e.target.value)}>
          <option value="">Todas as categorias</option>
          {[...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select className={SELECT_CLS} value={filtros.payment_method ?? ''} onChange={(e) => setFiltro('payment_method', e.target.value)}>
          <option value="">Todos os métodos</option>
          {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <Button size="sm" variant="outline" className="gap-1 ml-auto" onClick={exportarCSV} disabled={!lista.length}>
          <Download className="w-4 h-4" /> CSV
        </Button>
      </div>

      {/* Lista */}
      {error ? (
        <ErrorState title="Erro ao carregar finanças" description={(error as Error).message}
          action={<Button size="sm" onClick={() => void refetch()}>Tentar novamente</Button>} />
      ) : isLoading ? (
        <LoadingState message="A carregar lançamentos..." />
      ) : lista.length === 0 ? (
        <EmptyState icon={<Clock className="w-12 h-12" />} title="Sem lançamentos" description="Registe a primeira entrada ou saída de caixa." />
      ) : (
        <>
          <div className="sm:hidden bg-white rounded-lg border border-gray-200 p-4">
            <MobileCardList items={mobileItems} />
          </div>
          <div className="hidden sm:block">
            <DataTableWrapper columns={colunas} rows={linhas} />
          </div>
        </>
      )}

      {/* Modais */}
      {novoTipo && (
        <TransacaoModal isOpen={!!novoTipo} onClose={() => setNovoTipo(null)} tipo={novoTipo} currency={currency} defaultDate={hoje} />
      )}
      {editar && (
        <TransacaoModal isOpen={!!editar} onClose={() => setEditar(null)} tipo={editar.type} currency={currency} defaultDate={hoje} transacao={editar} />
      )}
      <ConfirmDialog
        isOpen={!!apagar}
        onClose={() => { setApagar(null); apagarMut.reset() }}
        onConfirm={() => apagar && apagarMut.mutate(apagar.id, { onSuccess: () => setApagar(null) })}
        title="Apagar lançamento"
        description={apagar ? `Apagar este lançamento de ${fmt(apagar.amount)}? O histórico é preservado (soft-delete).` : undefined}
        confirmLabel="Apagar"
        isLoading={apagarMut.isPending}
        error={apagarMut.isError ? (apagarMut.error as Error).message : null}
      />
    </div>
  )
}
