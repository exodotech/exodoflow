'use client'
// Painel de Segurança — gestão de 2FA (TOTP). Opt-in: o utilizador ativa um
// autenticador; quem tiver fator é desafiado no login.
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, Plus, Trash2, Smartphone, Check } from 'lucide-react'
import SectionHeader from '@/components/design-system/SectionHeader/SectionHeader'
import { Button } from '@/components/design-system/Button/Button'
import { Input }  from '@/components/design-system/Input/Input'
import Badge      from '@/components/design-system/Badge/Badge'
import { listarFatores, inscreverTotp, confirmarInscricao, removerFator, type InscricaoTotp } from '@/services/mfa'

export function PainelSeguranca() {
  const qc = useQueryClient()
  const { data: fatores = [], isLoading } = useQuery({ queryKey: ['mfa-fatores'], queryFn: listarFatores })
  const verificados = fatores.filter((f) => f.status === 'verified')

  const [inscricao, setInscricao] = useState<InscricaoTotp | null>(null)
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  function invalidar() { void qc.invalidateQueries({ queryKey: ['mfa-fatores'] }) }

  const iniciar = useMutation({
    mutationFn: () => inscreverTotp(),
    onSuccess: (d) => { setInscricao(d); setCodigo(''); setErro(null) },
    onError: (e) => setErro((e as Error).message),
  })
  const confirmar = useMutation({
    mutationFn: () => confirmarInscricao(inscricao!.factorId, codigo.trim()),
    onSuccess: () => { setInscricao(null); setCodigo(''); setErro(null); invalidar() },
    onError: (e) => setErro((e as Error).message),
  })
  const remover = useMutation({ mutationFn: (id: string) => removerFator(id), onSuccess: invalidar })

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm p-6">
        <SectionHeader title="Autenticação em dois passos (2FA)" />
        <p className="text-sm text-gray-500 mt-1">
          Adiciona uma camada extra: além da palavra-passe, pede um código do teu app autenticador
          (Google Authenticator, Authy, 1Password…) ao entrar.
        </p>

        {/* Estado atual */}
        <div className="mt-4 flex items-center gap-2">
          {verificados.length > 0
            ? <Badge variant="success"><span className="inline-flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Ativo</span></Badge>
            : <Badge variant="warning">Inativo</Badge>}
          <span className="text-xs text-gray-500">{verificados.length} autenticador(es) configurado(s)</span>
        </div>

        {/* Lista de fatores */}
        {isLoading ? (
          <p className="text-sm text-gray-400 italic mt-4">A carregar…</p>
        ) : verificados.length > 0 && (
          <ul className="mt-4 space-y-2">
            {verificados.map((f) => (
              <li key={f.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <span className="flex items-center gap-2 text-sm text-gray-800">
                  <Smartphone className="w-4 h-4 text-gray-400" /> {f.friendlyName || 'Autenticador'}
                </span>
                <button onClick={() => remover.mutate(f.id)} disabled={remover.isPending}
                  className="p-1.5 rounded text-red-500 hover:bg-red-50 disabled:opacity-50" title="Remover">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Fluxo de inscrição */}
        {!inscricao ? (
          <Button size="sm" className="mt-4 gap-1.5" onClick={() => iniciar.mutate()} isLoading={iniciar.isPending} disabled={iniciar.isPending}>
            <Plus className="w-4 h-4" /> Adicionar autenticador
          </Button>
        ) : (
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-gray-900">1. Leia o QR code no seu app autenticador</p>
            <div className="bg-white inline-block p-3 rounded-lg border border-gray-200" dangerouslySetInnerHTML={{ __html: inscricao.qrSvg }} />
            <p className="text-xs text-gray-500">Ou introduza a chave manualmente:</p>
            <code className="block text-xs bg-white border border-gray-200 rounded px-2 py-1 font-mono break-all">{inscricao.secret}</code>
            <p className="text-sm font-medium text-gray-900 pt-1">2. Introduza o código de 6 dígitos</p>
            <Input aria-label="Código de verificação" inputMode="numeric" placeholder="000000" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            {erro && <p className="text-xs text-red-600">{erro}</p>}
            <div className="flex items-center gap-2">
              <Button size="sm" className="gap-1.5" onClick={() => confirmar.mutate()} isLoading={confirmar.isPending} disabled={confirmar.isPending || codigo.trim().length < 6}>
                <Check className="w-4 h-4" /> Ativar 2FA
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setInscricao(null); setErro(null) }}>Cancelar</Button>
            </div>
          </div>
        )}
        {iniciar.isError && !inscricao && <p className="text-xs text-red-600 mt-2">{(iniciar.error as Error).message}</p>}
      </div>
    </div>
  )
}
