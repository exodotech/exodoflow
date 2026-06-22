'use client'
// "Esqueci a senha" — pede o e-mail e dispara o reset via Supabase Auth.
// PRIVACIDADE (OWASP): a mensagem é SEMPRE neutra — nunca revela se o e-mail
// existe. Não logamos a senha (aqui nem há senha).
import React, { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useFormWithZod } from '@/hooks/useFormWithZod'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validators/auth'
import { Button } from '@/components/design-system/Button/Button'
import { Input }  from '@/components/design-system/Input/Input'

const MENSAGEM_NEUTRA =
  'Se este e-mail existir, enviámos instruções para redefinir a palavra-passe. Verifique a sua caixa de entrada (e o spam).'

export function ForgotPasswordForm() {
  const [enviado, setEnviado] = useState(false)
  const [erroRede, setErroRede] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useFormWithZod(forgotPasswordSchema)

  async function onSubmit(data: ForgotPasswordInput) {
    setErroRede(null)
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`
    // resetPasswordForEmail não revela se o e-mail existe — devolve sucesso de
    // qualquer forma. Mostramos a mesma mensagem neutra em qualquer caso.
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, { redirectTo })
    if (error && /rate|network|fetch/i.test(error.message)) {
      // Só erros de rede/limite têm feedback distinto — nunca "e-mail não existe"
      setErroRede('Não foi possível processar agora. Tente novamente daqui a pouco.')
      return
    }
    setEnviado(true)
  }

  if (enviado) {
    return (
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
        </div>
        <p className="text-sm text-gray-700">{MENSAGEM_NEUTRA}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <p className="text-sm text-gray-500">
        Indique o e-mail da sua conta e enviaremos um link para definir uma nova palavra-passe.
      </p>
      <Input
        label="E-mail"
        type="email"
        autoComplete="email"
        placeholder="seu@email.pt"
        error={errors.email?.message}
        {...register('email')}
      />
      {erroRede && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{erroRede}</p>
        </div>
      )}
      <Button type="submit" className="w-full" isLoading={isSubmitting} disabled={isSubmitting}>
        Enviar instruções
      </Button>
    </form>
  )
}
