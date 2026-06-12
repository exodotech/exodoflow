// Cliente Supabase com a SERVICE ROLE KEY — ignora RLS.
// ⚠️  APENAS server-side (Route Handlers). NUNCA importar em Client Components
//     nem em código que chegue ao browser. A chave vive em SUPABASE_SERVICE_ROLE_KEY
//     (sem prefixo NEXT_PUBLIC_), por isso não é exposta ao cliente.
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export function createAdminClient() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !service) {
    throw new Error('Configuração em falta: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient<Database>(url, service, {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  })
}
