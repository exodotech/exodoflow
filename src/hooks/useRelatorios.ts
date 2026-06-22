// Hooks TanStack Query — Módulo de Relatórios (F3).
// A lista é lida do cliente (RLS garante isolamento). O trigger de geração
// chama a route handler server-side que usa o admin client.
'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { RelatorioLog, RelatorioTipo } from '@/types/domain/relatorios'

export const RELATORIOS_KEY = ['relatorios'] as const

// Busca logs de relatório do tenant (apenas relatorio_diario e relatorio_mensal)
async function listarLogsRelatorioCliente(limit = 30): Promise<RelatorioLog[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('communication_logs')
    .select('id,tenant_id,event_type,recipient,body,status,created_at')
    .in('event_type', ['relatorio_diario', 'relatorio_mensal'])
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`Erro ao listar relatórios: ${error.message}`)
  return (data ?? []) as RelatorioLog[]
}

export function useRelatorios(limit = 30) {
  return useQuery({
    queryKey: [...RELATORIOS_KEY, limit],
    queryFn:  () => listarLogsRelatorioCliente(limit),
  })
}

// Trigger manual de geração via route handler /api/relatorios/gerar
async function dispararRelatorio(payload: { tipo: RelatorioTipo; periodo?: string }) {
  const res = await fetch('/api/relatorios/gerar', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
  const json = await res.json() as { error?: string; assunto?: string; resumo?: unknown }
  if (!res.ok) throw new Error(json.error ?? 'Erro ao gerar relatório.')
  return json
}

export function useGerarRelatorio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { tipo: RelatorioTipo; periodo?: string }) => dispararRelatorio(payload),
    onSuccess:  () => void qc.invalidateQueries({ queryKey: RELATORIOS_KEY }),
  })
}
