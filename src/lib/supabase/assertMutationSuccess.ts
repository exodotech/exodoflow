// Validação obrigatória de mutações Supabase.
// Um UPDATE/DELETE bloqueado por RLS devolve error=null e 0 linhas afectadas —
// NUNCA tratar isso como sucesso. Este helper torna o silêncio num erro explícito.
//
// Uso: encadear .select('id') na mutação para obter as linhas afectadas e passar
// o resultado aqui. Exemplo:
//   const { data, error } = await supabase.from('tenants').update({...}).eq('id', id).select('id')
//   assertMutationSuccess(data, error, 'actualizar tenant')

import type { PostgrestError } from '@supabase/supabase-js'

export function assertMutationSuccess(
  data:    unknown[] | null,
  error:   PostgrestError | null,
  operacao: string
): void {
  if (error) {
    throw new Error(`Erro ao ${operacao}: ${error.message}`)
  }
  if (!data || data.length === 0) {
    throw new Error(
      `Operação "${operacao}" não afectou nenhuma linha. ` +
      'Possível bloqueio RLS (sem permissão) ou registo inexistente.'
    )
  }
}
