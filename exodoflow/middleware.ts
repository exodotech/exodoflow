// Middleware de autenticação — executado em cada pedido
// Responsável por: renovar a sessão Supabase e proteger rotas privadas
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Criar uma resposta base que será modificada com os cookies de sessão
  let supabaseResponse = NextResponse.next({ request })

  // Cliente Supabase leve para o middleware — usa apenas cookies de pedido/resposta
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // Propagar os cookies renovados para o pedido e para a resposta
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: usar getUser() e não getSession()
  // getSession() pode ser falsificado; getUser() valida o JWT com o servidor Supabase.
  // try/catch: uma sessão corrompida (ex: refresh token revogado) não pode crashar
  // o pedido — trata-se como não autenticado e segue o fluxo de redirect normal.
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    user = null
  }

  const { pathname } = request.nextUrl
  const isDashboard  = pathname.startsWith('/dashboard')
  const isAdmin      = pathname.startsWith('/admin')
  const isLogin      = pathname === '/login'
  const isAuthFlow   = pathname.startsWith('/auth/')

  // Redirecionar para login se tentar aceder a área privada sem sessão
  // (a verificação de role SUPERADMIN para /admin é feita no admin/layout.tsx)
  if (!user && (isDashboard || isAdmin)) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Utilizador autenticado não precisa de /login — ir para dashboard
  // (/register é página informativa, pode ser vista por qualquer pessoa)
  if (user && isLogin) {
    const dashboardUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  // Permitir fluxos de auth (callback de e-mail, OAuth) sem redirect
  if (isAuthFlow) return supabaseResponse

  return supabaseResponse
}

// Aplicar middleware a todas as rotas excepto assets estáticos e imagens
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
