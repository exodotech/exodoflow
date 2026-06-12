'use client'
import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import PageHeader     from '@/components/design-system/PageHeader/PageHeader'
import SectionHeader  from '@/components/design-system/SectionHeader/SectionHeader'
import { Button }     from '@/components/design-system/Button/Button'
import { Input }      from '@/components/design-system/Input/Input'
import { useFormWithZod } from '@/hooks/useFormWithZod'
import { useAuth }        from '@/providers/AuthProvider'
import { atualizarPerfilProprio, alterarPassword } from '@/services/perfil'
import {
  atualizarPerfilSchema, alterarPasswordSchema,
  type AtualizarPerfilInput, type AlterarPasswordInput,
} from '@/lib/validators/perfil'

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Administrador do Sistema',
  owner: 'Proprietário', manager: 'Gestor',
  receptionist: 'Recepcionista', staff: 'Colaborador',
}

export default function PerfilPage() {
  const { user, profile } = useAuth()

  // ── Form 1: dados pessoais ──────────────────────────────────────────────
  const perfilForm = useFormWithZod(atualizarPerfilSchema, {
    defaultValues: { full_name: profile?.full_name ?? '', phone: profile?.phone ?? '' },
  })
  const perfilMut = useMutation({
    mutationFn: (data: AtualizarPerfilInput) => atualizarPerfilProprio(data),
  })

  // ── Form 2: palavra-passe ───────────────────────────────────────────────
  const pwForm = useFormWithZod(alterarPasswordSchema)
  const [pwSucesso, setPwSucesso] = useState(false)
  const pwMut = useMutation({
    mutationFn: (data: AlterarPasswordInput) => alterarPassword(data.password),
    onSuccess:  () => { setPwSucesso(true); pwForm.reset() },
  })

  return (
    <div>
      <PageHeader title="A minha conta" description="Os seus dados pessoais e segurança" />

      <div className="max-w-2xl space-y-6">
        {/* Identificação (leitura) */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <SectionHeader title="Identificação" />
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">E-mail</p>
              <p className="text-sm text-gray-900">{user?.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Função</p>
              <p className="text-sm text-gray-900">{ROLE_LABEL[profile?.role ?? ''] ?? profile?.role ?? '—'}</p>
            </div>
          </div>
        </div>

        {/* Dados pessoais (editável) */}
        <form
          onSubmit={perfilForm.handleSubmit((d) => { perfilMut.reset(); perfilMut.mutate(d) })}
          noValidate
          className="bg-white rounded-lg border border-gray-200 p-6 space-y-4"
        >
          <SectionHeader title="Dados pessoais" />
          <Input
            label="Nome completo"
            error={perfilForm.formState.errors.full_name?.message}
            {...perfilForm.register('full_name')}
          />
          <Input
            label="Telefone"
            type="tel"
            placeholder="+351 912 345 678"
            error={perfilForm.formState.errors.phone?.message}
            {...perfilForm.register('phone')}
          />
          <div className="flex items-center gap-3">
            <Button type="submit" isLoading={perfilMut.isPending} disabled={perfilMut.isPending}>
              Guardar
            </Button>
            {perfilMut.isSuccess && <span className="text-sm text-green-600">Guardado!</span>}
            {perfilMut.isError && (
              <span className="text-sm text-red-600">{(perfilMut.error as Error).message}</span>
            )}
          </div>
        </form>

        {/* Palavra-passe */}
        <form
          onSubmit={pwForm.handleSubmit((d) => { setPwSucesso(false); pwMut.reset(); pwMut.mutate(d) })}
          noValidate
          className="bg-white rounded-lg border border-gray-200 p-6 space-y-4"
        >
          <SectionHeader title="Alterar palavra-passe" />
          <p className="text-xs text-gray-500 -mt-2">
            Se entrou com uma palavra-passe temporária, defina aqui a sua palavra-passe pessoal.
          </p>
          <Input
            label="Nova palavra-passe"
            type="password"
            autoComplete="new-password"
            error={pwForm.formState.errors.password?.message}
            {...pwForm.register('password')}
          />
          <Input
            label="Confirmar palavra-passe"
            type="password"
            autoComplete="new-password"
            error={pwForm.formState.errors.confirmPassword?.message}
            {...pwForm.register('confirmPassword')}
          />
          <div className="flex items-center gap-3">
            <Button type="submit" isLoading={pwMut.isPending} disabled={pwMut.isPending}>
              Alterar palavra-passe
            </Button>
            {pwSucesso && <span className="text-sm text-green-600">Palavra-passe alterada!</span>}
            {pwMut.isError && (
              <span className="text-sm text-red-600">{(pwMut.error as Error).message}</span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
