// Serviço — Recibos (comprovativo de pagamento numerado).
// Emissão só via RPC emitir_recibo (numeração atómica + snapshot imutável).
// RLS garante que só owner/manager do tenant leem (migração 0037).
import { createClient } from '@/lib/supabase/client'
import { registarAuditoria } from '@/services/audit'
import type { Receipt } from '@/types/domain/financas'

// Emite (ou devolve, se já existir) o recibo de uma receita. Idempotente.
export async function emitirRecibo(transactionId: string): Promise<Receipt> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('emitir_recibo', { p_transaction_id: transactionId })
  if (error) throw new Error(`Erro ao emitir recibo: ${error.message}`)
  const recibo = (Array.isArray(data) ? data[0] : data) as Receipt
  await registarAuditoria('receipt.issue', {
    table: 'receipts', recordId: recibo.id,
    metadata: { number: recibo.number, year: recibo.year },
  })
  return recibo
}

// Lista os recibos do tenant (mais recentes primeiro).
export async function listarRecibos(): Promise<Receipt[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .order('issued_at', { ascending: false })
    .limit(1000)
  if (error) throw new Error(`Erro ao listar recibos: ${error.message}`)
  return (data ?? []) as Receipt[]
}

// Devolve o recibo já emitido para uma transação (ou null se ainda não existe).
export async function getReciboPorTransacao(transactionId: string): Promise<Receipt | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('transaction_id', transactionId)
    .maybeSingle()
  if (error) throw new Error(`Erro ao obter recibo: ${error.message}`)
  return (data as Receipt | null) ?? null
}
