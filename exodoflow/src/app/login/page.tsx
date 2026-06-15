import React    from 'react'
import Link      from 'next/link'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { LoginForm } from '@/components/features/auth/LoginForm'
import { Logo }      from '@/components/brand/Logo'

export const metadata: Metadata = {
  title: 'Entrar — ExodoFlow Pro',
}

export default async function LoginPage() {
  // Defesa em profundidade: se já houver sessão, não mostrar o login.
  // O superadmin é encaminhado para /admin; os restantes para /dashboard
  // (o dashboard/layout reencaminha conforme onboarding/role). Evita o ecrã
  // de login "preso" para quem já está autenticado.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    redirect(profile?.role === 'superadmin' ? '/admin' : '/dashboard')
  }

  return <LoginView />
}

function LoginView() {
  return (
    // Paleta da MARCA (não tenant): o login não tem tenant, por isso usa a cor
    // da marca ExodoFlow Pro (teal do logo) em vez do azul genérico. Botão,
    // links e foco dos inputs herdam --tenant-primary aqui sobrescrito.
    <main
      className="min-h-screen app-bg flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8"
      style={{ ['--tenant-primary' as string]: 'var(--brand)' }}
    >
      {/* Cabeçalho da marca */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8">
        <Logo variant="full" showTagline className="w-full" />
      </div>

      {/* Cartão do formulário */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/80 backdrop-blur-sm py-8 px-6 shadow-sm rounded-2xl border border-white/60">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">
            Iniciar sessão
          </h2>
          <LoginForm />
          <p className="mt-4 text-center text-sm">
            <Link href="/forgot-password" className="text-[color:var(--tenant-primary)] hover:underline">
              Esqueceu a palavra-passe?
            </Link>
          </p>
          {/* Registo público desactivado — acesso por convite do administrador */}
          <p className="mt-6 text-center text-xs text-slate-400">
            Acesso por convite.{' '}
            <Link href="/register" className="text-slate-500 hover:underline">
              Saber mais
            </Link>
          </p>
        </div>

        {/* Rodapé discreto da marca */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Powered by <span className="font-medium text-slate-500">Êxodo Tech</span>
        </p>
      </div>
    </main>
  )
}
