// Serviço — Comissões por profissional.
// Lê via RPC relatorio_comissoes (SECURITY DEFINER, só owner/manager).
import { createClient } from '@/lib/supabase/client'

export interface LinhaComissao {
  resource_id:        string
  resource_name:      string
  commission_percent: number
  total_servicos:     number
  total_faturado:     number
  total_comissao:     number
}

// Devolve as comissões por profissional num período (datas YYYY-MM-DD inclusivas).
export async function relatorioComissoes(from: string, to: string): Promise<LinhaComissao[]> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('relatorio_comissoes', { p_from: from, p_to: to })
  if (error) throw new Error(`Erro ao calcular comissões: ${error.message}`)
  type Row = {
    resource_id: string; resource_name: string; commission_percent: number | string
    total_servicos: number | string; total_faturado: number | string; total_comissao: number | string
  }
  return ((data ?? []) as Row[]).map((r) => ({
    resource_id:        r.resource_id,
    resource_name:      r.resource_name,
    commission_percent: Number(r.commission_percent),
    total_servicos:     Number(r.total_servicos),
    total_faturado:     Number(r.total_faturado),
    total_comissao:     Number(r.total_comissao),
  }))
}
