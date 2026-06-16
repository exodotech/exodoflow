'use client'
// Formulário de login — usa React Hook Form + Zod + Supabase Auth
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useFormWithZod } from '@/hooks/useFormWithZod'
import { loginSchema, type LoginInput } from '@/lib/validators/auth'
import { registarUltimoAcesso } from '@/services/equipa'
import { nivelMfa, listarFatores, desafiarLogin } from '@/services/mfa'
import { Button } from '@/components/design-system/Button/Button'
import { Input }  from '@/components/design-system/Input/Input'

export function LoginForm() {
  const router              = useRouter()
  const [authError, setAuthError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  // Passo de 2FA: presente quando o utilizador tem MFA e falta o código.
  const [mfa, setMfa] = useState<{ factorId: string } | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useFormWithZod(loginSchema)

  // Conclui o login (último acesso + navegação). Só após aal2 se houver MFA.
  async function concluir() {
    await registarUltimoAcesso()
    router.push('/dashboard')
    router.refresh()
  }

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

    // 2FA: se o utilizador tiver MFA, a sessão está em aal1 e falta elevar a aal2.
    try {
      const { atual, proximo } = await nivelMfa()
      if (proximo === 'aal2' && atual !== 'aal2') {
        const fatores = await listarFatores()
        const fator = fatores.find((f) => f.status === 'verified')
        if (fator) { setMfa({ factorId: fator.id }); return }   // pede o código
      }
    } catch { /* se a verificação de AAL falhar, segue sem bloquear o login normal */ }

    await concluir()
  }

  async function onVerificarMfa() {
    if (!mfa) return
    setAuthError(null); setMfaLoading(true)
    try {
      await desafiarLogin(mfa.factorId, mfaCode.trim())
      await concluir()
    } catch {
      setAuthError('Código inválido. Tente novamente.')
      setMfaLoading(false)
    }
  }

  // Passo de 2FA — pede o código do autenticador antes de concluir o login.
  if (mfa) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Verificação em dois passos</h2>
          <p className="text-sm text-slate-600 mt-1">Introduza o código de 6 dígitos do seu app autenticador.</p>
        </div>
        <Input
          label="Código"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          value={mfaCode}
          onChange={(e) => setMfaCode(e.target.value)}
          autoFocus
        />
        {authError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{authError}</p>
          </div>
        )}
        <Button variant="primary" size="md" fullWidth onClick={onVerificarMfa}
          isLoading={mfaLoading} disabled={mfaLoading || mfaCode.trim().length < 6}>
          {mfaLoading ? 'A verificar...' : 'Verificar e entrar'}
        </Button>
        <button type="button" onClick={() => { setMfa(null); setMfaCode(''); setAuthError(null) }}
          className="text-xs text-slate-500 hover:text-slate-700 w-full text-center">
          Cancelar
        </button>
      </div>
    )
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
