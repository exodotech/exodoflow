// Serviço — Avaliações pós-atendimento. RLS limita ao tenant (migração 0040).
import { createClient } from '@/lib/supabase/client'
import { getTenantId }  from '@/lib/supabase/getTenantId'
import { registarAuditoria } from '@/services/audit'
import type { Database } from '@/types/database'
import type { CriarReviewInput } from '@/lib/validators/review'

export type Review = Database['public']['Tables']['reviews']['Row']

// Lista as avaliações de um cliente (mais recentes primeiro).
export async function listarReviewsCliente(clientId: string): Promise<Review[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Erro ao listar avaliações: ${error.message}`)
  return (data ?? []) as Review[]
}

// Média de satisfação do tenant (1–5) e total de avaliações.
export async function resumoReviews(): Promise<{ media: number; total: number }> {
  const supabase = createClient()
  const { data, error } = await supabase.from('reviews').select('rating')
  if (error) throw new Error(`Erro ao calcular satisfação: ${error.message}`)
  const notas = (data ?? []).map((r) => r.rating as number)
  const total = notas.length
  const media = total ? notas.reduce((a, b) => a + b, 0) / total : 0
  return { media, total }
}

// Regista uma avaliação.
export async function criarReview(input: CriarReviewInput): Promise<void> {
  const supabase = createClient()
  const tenant_id = await getTenantId()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      tenant_id,
      client_id:  input.client_id,
      booking_id: input.booking_id || null,
      rating:     input.rating,
      comment:    input.comment?.trim() || null,
      created_by: user?.id ?? null,
    })
    .select('id')
    .single()
  if (error) throw new Error(`Erro ao guardar avaliação: ${error.message}`)
  await registarAuditoria('review.create', { table: 'reviews', recordId: data.id, metadata: { rating: input.rating } })
}

// Remove uma avaliação.
export async function removerReview(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('reviews').delete().eq('id', id)
  if (error) throw new Error(`Erro ao remover avaliação: ${error.message}`)
  await registarAuditoria('review.delete', { table: 'reviews', recordId: id })
}
