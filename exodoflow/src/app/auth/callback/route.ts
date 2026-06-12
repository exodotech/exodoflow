// Callback de autenticação Supabase
// Trata o código de autorização recebido após login por e-mail/OAuth
// e troca-o por uma sessão (access token + refresh token)
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies }            from 'next/headers'
import { NextResponse }       from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  // Destino após troca do código. Só caminhos relativos (começam por "/" mas não
  // "//") — evita open redirect para domínios externos. Default: /dashboard.
  const nextParam = searchParams.get('next')
  const next = nextParam && /^\/(?!\/)/.test(nextParam) ? nextParam : '/dashboard'

  // Erro de autenticação retornado pelo Supabase
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`)
  }

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (!exchangeError) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Falha no callback — redirecionar para login com indicação de erro
  return NextResponse.redirect(`${origin}/login?error=auth-callback`)
}
