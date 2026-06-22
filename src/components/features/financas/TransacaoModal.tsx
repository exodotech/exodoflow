'use client'
// Modal de lançamento financeiro — criar OU editar uma entrada/saída.
import { useEffect } from 'react'
import { Save, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { Modal }  from '@/components/design-system/Modal/Modal'
import { Button } from '@/components/design-system/Button/Button'
import { Input }  from '@/components/design-system/Input/Input'
import { useFormWithZod } from '@/hooks/useFormWithZod'
import { useCriarTransacao, useAtualizarTransacao } from '@/hooks/useFinancas'
import { criarTransacaoSchema, type CriarTransacaoInput } from '@/lib/validators/financas'
import {
  INCOME_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS,
  type FinancialType, type FinancialTransaction,
} from '@/types/domain/financas'

interface Props {
  isOpen:      boolean
  onClose:     () => void
  tipo:        FinancialType                 // entrada (income) ou saída (expense)
  currency:    string
  defaultDate: string                        // hoje no fuso do tenant (YYYY-MM-DD)
  transacao?:  FinancialTransaction | null   // presente = edição
}

const SELECT_CLS = 'w-full h-[42px] rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-[color:var(--tenant-primary)] focus:outline-none'

export function TransacaoModal({ isOpen, onClose, tipo, currency, defaultDate, transacao }: Props) {
  const modoEdicao = !!transacao
  const tipoActual = transacao?.type ?? tipo
  const criar      = useCriarTransacao()
  const atualizar  = useAtualizarTransacao()

  const categorias = tipoActual === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useFormWithZod(criarTransacaoSchema, {
      defaultValues: {
        type: tipoActual, category: categorias[0].value, payment_method: 'dinheiro',
        transaction_date: defaultDate, amount: undefined, description: '',
      },
    })

  useEffect(() => {
    if (!isOpen) return
    if (transacao) {
      reset({
        type: transacao.type, category: transacao.category,
        payment_method: transacao.payment_method as CriarTransacaoInput['payment_method'],
        transaction_date: transacao.transaction_date, amount: transacao.amount,
        description: transacao.description ?? '',
      })
    } else {
      reset({ type: tipo, category: (tipo === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)[0].value, payment_method: 'dinheiro', transaction_date: defaultDate, amount: undefined, description: '' })
    }
  }, [isOpen, transacao, tipo, defaultDate, reset])

  async function onSubmit(data: CriarTransacaoInput) {
    if (modoEdicao && transacao) {
      await atualizar.mutateAsync({ id: transacao.id, input: data })
    } else {
      await criar.mutateAsync({ input: data, currency })
    }
    onClose()
  }

  const erro = (modoEdicao ? atualizar.error : criar.error) as Error | null
  const isEntrada = tipoActual === 'income'
  const titulo = modoEdicao
    ? 'Editar lançamento'
    : isEntrada ? 'Nova entrada' : 'Nova saída'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titulo}
      size="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" form="form-transacao" size="sm" isLoading={isSubmitting} disabled={isSubmitting}>
            <Save className="w-4 h-4" /> Guardar
          </Button>
        </>
      }
    >
      <form id="form-transacao" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className={`flex items-center gap-2 text-sm font-medium ${isEntrada ? 'text-emerald-700' : 'text-red-700'}`}>
          {isEntrada ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
          {isEntrada ? 'Entrada (dinheiro que entra)' : 'Saída (dinheiro que sai)'}
        </div>
        <input type="hidden" {...register('type')} />

        <div className="grid grid-cols-2 gap-4">
          <Input label={`Valor (${currency})`} type="number" step="0.01" min="0" placeholder="0,00"
            error={errors.amount?.message} {...register('amount')} />
          <Input label="Data" type="date" error={errors.transaction_date?.message} {...register('transaction_date')} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select className={SELECT_CLS} {...register('category')}>
              {categorias.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Método</label>
            <select className={SELECT_CLS} {...register('payment_method')}>
              {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
          <input className={SELECT_CLS} placeholder="Ex.: produto vendido, fornecedor..." {...register('description')} />
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{erro.message}</p>
          </div>
        )}
      </form>
    </Modal>
  )
}
