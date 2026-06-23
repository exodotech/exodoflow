import { NextResponse, type NextRequest } from 'next/server'

// Middleware leve para Next.js 15 (Edge Runtime).
// Verificação de cookie sem chamadas HTTP — a validação real do JWT
// é feita nos Server Components (dashboard/layout.tsx, admin/layout.tsx).
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isDashboard = pathname.startsWith('/dashboard')
  const isAdmin     = pathname.startsWith('/admin')
  const isLogin     = pathname === '/login'

  // Supabase guarda a sessão num cookie com prefixo "sb-" e sufixo "-auth-token"
  const hasSession = request.cookies.getAll().some(
    (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'),
  )

  if (!hasSession && (isDashboard || isAdmin)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (hasSession && isLogin) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
