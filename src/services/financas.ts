// Serviço — Módulo Financeiro (controlo interno de caixa).
// RLS garante que só owner/manager do tenant leem/escrevem (migração 0029).
// Soft-delete (deleted_at). Toda a escrita gera audit log (sem dados sensíveis).
import { createClient } from '@/lib/supabase/client'
import { getTenantId }  from '@/lib/supabase/getTenantId'
import { registarAuditoria } from '@/services/audit'
import type { FinancialTransaction, FinancialType } from '@/types/domain/financas'
import type { CriarTransacaoInput, AtualizarTransacaoInput } from '@/lib/validators/financas'

export interface FiltrosFinancas {
  from?:           string                    // YYYY-MM-DD
  to?:             string
  type?:           FinancialType | 'all'
  category?:       string
  payment_method?: string
  client_id?:      string
}

// Lista transações (não apagadas) do tenant com filtros opcionais.
export async function listarTransacoes(filtros: FiltrosFinancas = {}): Promise<FinancialTransaction[]> {
  const supabase = createClient()
  let q = supabase
    .from('financial_transactions')
    .select('*')
    .is('deleted_at', null)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1000)

  if (filtros.from)                                q = q.gte('transaction_date', filtros.from)
  if (filtros.to)                                  q = q.lte('transaction_date', filtros.to)
  if (filtros.type && filtros.type !== 'all')      q = q.eq('type', filtros.type)
  if (filtros.category)                            q = q.eq('category', filtros.category)
  if (filtros.payment_method)                      q = q.eq('payment_method', filtros.payment_method)
  if (filtros.client_id)                           q = q.eq('client_id', filtros.client_id)

  const { data, error } = await q
  if (error) throw new Error(`Erro ao listar transações: ${error.message}`)
  return (data ?? []) as FinancialTransaction[]
}

// Cria uma transação. A moeda vem do tenant (nunca escolhida no formulário).
export async function criarTransacao(input: CriarTransacaoInput, currency: string): Promise<FinancialTransaction> {
  const supabase = createClient()
  const tenant_id = await getTenantId()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('financial_transactions')
    .insert({
      tenant_id,
      type:             input.type,
      category:         input.category,
      description:      input.description || null,
      amount:           input.amount,
      currency,
      payment_method:   input.payment_method,
      transaction_date: input.transaction_date,
      booking_id:       input.booking_id || null,
      client_id:        input.client_id  || null,
      created_by:       user?.id ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(`Erro ao criar lançamento: ${error.message}`)

  await registarAuditoria('finance.create', {
    table: 'financial_transactions', recordId: data.id,
    metadata: { type: input.type, amount: input.amount, category: input.category },
  })
  return data as FinancialTransaction
}

// Atualiza uma transação existente.
export async function atualizarTransacao(id: string, input: AtualizarTransacaoInput): Promise<void> {
  const supabase = createClient()
  const patch: Record<string, unknown> = {}
  if (input.type             !== undefined) patch.type             = input.type
  if (input.category         !== undefined) patch.category         = input.category
  if (input.description      !== undefined) patch.description      = input.description || null
  if (input.amount           !== undefined) patch.amount           = input.amount
  if (input.payment_method   !== undefined) patch.payment_method   = input.payment_method
  if (input.transaction_date !== undefined) patch.transaction_date = input.transaction_date

  const { data, error } = await supabase
    .from('financial_transactions')
    .update(patch)
    .eq('id', id)
    .is('deleted_at', null)
    .select('id')
  if (error) throw new Error(`Erro ao atualizar lançamento: ${error.message}`)
  if (!data?.length) throw new Error('Lançamento não encontrado ou sem permissão.')
  await registarAuditoria('finance.update', { table: 'financial_transactions', recordId: id })
}

// Soft-delete (preserva histórico). Sem hard delete.
export async function apagarTransacao(id: string): Promise<void> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('financial_transactions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
    .select('id')
  if (error) throw new Error(`Erro ao apagar lançamento: ${error.message}`)
  if (!data?.length) throw new Error('Lançamento não encontrado ou sem permissão.')
  await registarAuditoria('finance.delete', { table: 'financial_transactions', recordId: id })
}
