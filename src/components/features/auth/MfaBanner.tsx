'use client'
// Banner de requisito de 2FA — mostrado a OWNER/SUPERADMIN que ainda não têm
// MFA ativo. Nudge forte (persistente) sem trancar a conta: leva ao painel de
// Segurança. Contas privilegiadas devem ter 2FA.
import React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'
import { listarFatores } from '@/services/mfa'

const PAPEIS_OBRIGATORIOS = ['owner', 'superadmin']

export function MfaBanner() {
  const { profile } = useAuth()
  const role = profile?.role ?? ''
  const exige = PAPEIS_OBRIGATORIOS.includes(role)

  const { data: fatores } = useQuery({
    queryKey: ['mfa-fatores'],
    queryFn: listarFatores,
    enabled: exige,
  })

  // Só mostra quando: papel privilegiado, dados carregados, e SEM fator verificado.
  if (!exige || fatores === undefined) return null
  const temMfa = fatores.some((f) => f.status === 'verified')
  if (temMfa) return null

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
      <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-amber-900">Ative a verificação em dois passos (2FA)</p>
        <p className="text-amber-800 mt-0.5">
          A sua conta tem permissões elevadas. Por segurança, ative o 2FA — leva menos de um minuto.
        </p>
      </div>
      <Link
        href="/dashboard/configuracoes?tab=seguranca"
        className="flex-shrink-0 self-center inline-flex items-center h-9 px-4 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors"
      >
        Ativar agora
      </Link>
    </div>
  )
}
