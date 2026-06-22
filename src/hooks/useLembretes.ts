// Hook para disparar manualmente o processamento de lembretes (simulado).
import { useMutation } from '@tanstack/react-query'

export interface LembretesResult { enviados: number; ignorados: number; mock: boolean }

async function processarLembretes(): Promise<LembretesResult> {
  const res = await fetch('/api/lembretes/processar', { method: 'POST' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Erro ao processar lembretes.')
  return data as LembretesResult
}

export function useProcessarLembretes() {
  return useMutation({ mutationFn: processarLembretes })
}
