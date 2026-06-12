// Cliente Supabase para uso em Client Components (browser)
// Importar este ficheiro apenas em componentes marcados com 'use client'
import { createBrowserClient } from '@supabase/ssr'

// Cria e retorna um cliente Supabase para o browser
// Usa as variáveis de ambiente NEXT_PUBLIC_* (visíveis no browser)
// O acesso é controlado pelas políticas RLS — apenas a chave anónima é segura no browser
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
