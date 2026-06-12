'use client'
// Definir nova palavra-passe após o link de recuperação.
// Fluxo: o link do e-mail passa por /auth/callback (troca o código por sessão) e
// redirige para aqui. Com sessão válida, permite definir a nova senha (forte).
// Se não houver sessão (link expirado/inválido), mostra mensagem clara.
// NUNCA mostra o token; NUNCA loga a senha.
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useFormWithZod } from '@/hooks/useFormWithZod'
import { definirPasswordSchema, type DefinirPasswordInput } from '@/lib/validators/auth'
import { Button } from '@/components/design-system/Button/Button'
import { Input }  from '@/components/design-system/Input/Input'

type Estado = 'a-verificar' | 'pronto' | 'invalido' | 'sucesso'

export function ResetPasswordForm() {
  const router = useRouter()
  const [estado, setEstado] = useState<Estado>('a-verificar')
  const [erro, setErro]     = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useFormWithZod(definirPasswordSchema)

  // Verifica se existe uma sessão (de recuperação) válida.
  useEffect(() => {
    const supabase = createClient()
    let resolvido = false

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && !resolvido)) {
        resolvido = true
        setEstado('pronto')
      }
    })

    supabase.auth.getSession().then(({ data }) => {
      if (resolvido) return
      resolvido = true
      setEstado(data.session ? 'pronto' : 'invalido')
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  async function onSubmit(data: DefinirPasswordInput) {
    setErro(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) {
      setErro(/expired|invalid|session/i.test(error.message)
        ? 'O link expirou. Peça um novo a partir de "Esqueci a palavra-passe".'
        : 'Não foi possível alterar a palavra-passe. Tente novamente.')
      return
    }
    // Sucesso: termina a sessão de recuperação e leva ao login com a nova senha.
    setEstado('sucesso')
    await supabase.auth.signOut().catch(() => {})
    setTimeout(() => { router.push('/login'); router.refresh() }, 1800)
  }

  if (estado === 'a-verificar') {
    return <p className="text-sm text-gray-500 py-6 text-center">A validar o link…</p>
  }

  if (estado === 'invalido') {
    return (
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 rounded-full">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
        </div>
        <p className="text-sm text-gray-700">
          Este link de recuperação é inválido ou expirou.
        </p>
        <Link href="/forgot-password" className="inline-block text-sm font-medium text-blue-600 hover:underline">
          Pedir um novo link
        </Link>
      </div>
    )
  }

  if (estado === 'sucesso') {
    return (
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
        </div>
        <p className="text-sm text-gray-700">Palavra-passe alterada. A redirecionar para o login…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <Input
        label="Nova palavra-passe"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <Input
        label="Confirmar palavra-passe"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      <p className="text-xs text-gray-400">Mínimo 8 caracteres, com pelo menos uma letra e um número.</p>
      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{erro}</p>
        </div>
      )}
      <Button type="submit" className="w-full" isLoading={isSubmitting} disabled={isSubmitting}>
        Definir nova palavra-passe
      </Button>
    </form>
  )
}
