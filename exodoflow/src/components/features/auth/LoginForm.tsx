'use client'
// Formulário de login — usa React Hook Form + Zod + Supabase Auth
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useFormWithZod } from '@/hooks/useFormWithZod'
import { loginSchema, type LoginInput } from '@/lib/validators/auth'
import { registarUltimoAcesso } from '@/services/equipa'
import { Button } from '@/components/design-system/Button/Button'
import { Input }  from '@/components/design-system/Input/Input'

export function LoginForm() {
  const router              = useRouter()
  const [authError, setAuthError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useFormWithZod(loginSchema)

  async function onSubmit(data: LoginInput) {
    setAuthError(null)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email:    data.email,
      password: data.password,
    })

    if (error) {
      // Mensagem genérica — não revelar se o e-mail existe ou não (OWASP)
      setAuthError('E-mail ou palavra-passe incorrectos. Tente novamente.')
      return
    }

    // Regista o último acesso (não bloqueia o login se falhar)
    await registarUltimoAcesso()

    // Forçar re-render para que o middleware leia a nova sessão
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <Input
        label="E-mail"
        type="email"
        autoComplete="email"
        placeholder="nome@empresa.pt"
        error={errors.email?.message}
        {...register('email')}
      />

      <div className="relative">
        <Input
          label="Palavra-passe"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />
        {/* Alternar visibilidade da palavra-passe */}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword((v) => !v)}
          className="absolute right-3 top-[42px] text-gray-400 hover:text-gray-600"
          aria-label={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>

      {/* Erro de autenticação — genérico por segurança */}
      {authError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{authError}</p>
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="md"
        fullWidth
        isLoading={isSubmitting}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'A entrar...' : 'Entrar'}
      </Button>
    </form>
  )
}
