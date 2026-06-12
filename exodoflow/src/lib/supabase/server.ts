// Cliente Supabase para uso em Server Components e Route Handlers
// NUNCA importar em Client Components (contém acesso a cookies do servidor)
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies }                                 from 'next/headers'

// Cria e retorna um cliente Supabase configurado com os cookies do pedido
// Necessário para que o servidor conheça o utilizador autenticado (JWT via cookie)
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            // Definir cookies de sessão (refresh token, access token)
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignorar erros ao definir cookies em Server Components
            // (apenas Route Handlers e Server Actions podem modificar cookies)
          }
        },
      },
    }
  )
}
