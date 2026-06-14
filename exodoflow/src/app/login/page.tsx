import React    from 'react'
import Link      from 'next/link'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { LoginForm } from '@/components/features/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Entrar — ExodoFlow AI',
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
    <main className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Cabeçalho da marca */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-4">
          <span className="text-white font-bold text-lg">E</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">ExodoFlow AI</h1>
        <p className="mt-1 text-sm text-gray-500">
          Agenda inteligente para o seu negócio
        </p>
      </div>

      {/* Cartão do formulário */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm rounded-xl border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Iniciar sessão
          </h2>
          <LoginForm />
          <p className="mt-4 text-center text-sm">
            <Link href="/forgot-password" className="text-blue-600 hover:underline">
              Esqueceu a palavra-passe?
            </Link>
          </p>
          {/* Registo público desactivado — acesso por convite do administrador */}
          <p className="mt-6 text-center text-xs text-gray-400">
            Acesso por convite.{' '}
            <Link href="/register" className="text-gray-500 hover:underline">
              Saber mais
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
