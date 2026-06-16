'use client'
// Painel WhatsApp (Configurações) — ligar/desligar o canal Meta WhatsApp Cloud API.
// O backend (envio/templates/webhook) é real; aqui o OWNER insere as credenciais.
// O access_token é enviado à rota server-side e NUNCA volta ao browser.
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, Lock, Plug, PlugZap } from 'lucide-react'
import SectionHeader from '@/components/design-system/SectionHeader/SectionHeader'
import { Button } from '@/components/design-system/Button/Button'
import { Input }  from '@/components/design-system/Input/Input'
import { Badge }  from '@/components/design-system/Badge/Badge'
import AccessDenied from '@/components/design-system/AccessDenied/AccessDenied'
import { usePermissions } from '@/hooks/usePermissions'
import { obterEstadoWhatsApp, ligarWhatsApp, desligarWhatsApp } from '@/services/whatsapp'

export function PainelWhatsApp() {
  const qc = useQueryClient()
  const { isOwner, isManagerOrAbove } = usePermissions()
  const { data, isLoading } = useQuery({ queryKey: ['whatsapp-estado'], queryFn: obterEstadoWhatsApp })
  const ligado = data?.is_active === true

  const [phone, setPhone] = useState('')
  const [phoneId, setPhoneId] = useState('')
  const [token, setToken] = useState('')

  function invalidar() { void qc.invalidateQueries({ queryKey: ['whatsapp-estado'] }) }
  const ligar = useMutation({
    mutationFn: () => ligarWhatsApp({ phone_number: phone.trim(), phone_number_id: phoneId.trim(), access_token: token.trim() }),
    onSuccess: () => { setToken(''); invalidar() },
  })
  const desligar = useMutation({ mutationFn: () => desligarWhatsApp(), onSuccess: invalidar })

  if (!isManagerOrAbove) {
    return <AccessDenied title="Área restrita" description="Apenas o proprietário e gestores acedem às integrações." />
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <SectionHeader title="WhatsApp (Meta Cloud API)" />
          <Badge variant={ligado ? 'success' : 'default'}>{ligado ? 'Ligado' : 'Não configurado'}</Badge>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-400 italic mt-4">A carregar…</p>
        ) : ligado ? (
          /* ── Ligado: estado + desligar ── */
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <PlugZap className="w-4 h-4" /> WhatsApp ligado{data?.numero ? ` · ${data.numero}` : ''}. As mensagens e lembretes são enviados de verdade.
            </div>
            {isOwner && (
              <>
                <Button variant="outline" size="sm" className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
                  onClick={() => desligar.mutate()} isLoading={desligar.isPending} disabled={desligar.isPending}>
                  <Lock className="w-4 h-4" /> Desligar WhatsApp
                </Button>
                {desligar.isError && <p className="text-xs text-red-600">{(desligar.error as Error).message}</p>}
              </>
            )}
          </div>
        ) : !isOwner ? (
          <p className="text-sm text-gray-500 mt-4">O WhatsApp ainda não está ligado. Apenas o proprietário pode configurá-lo.</p>
        ) : (
          /* ── Não ligado: formulário de credenciais (owner) ── */
          <form onSubmit={(e) => { e.preventDefault(); ligar.mutate() }} className="mt-4 space-y-4">
            <p className="text-sm text-gray-600">
              Introduza as credenciais da <strong>Meta WhatsApp Cloud API</strong> (Phone Number ID e Access Token
              da app na Meta for Developers). O token é guardado em segurança no servidor.
            </p>
            <Input label="Número de telefone (apresentação)" type="tel" placeholder="+351 ..." value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input label="Phone Number ID" placeholder="ex.: 123456789012345" required value={phoneId} onChange={(e) => setPhoneId(e.target.value)} />
            <Input label="Access Token" type="password" placeholder="EAAG..." required value={token} onChange={(e) => setToken(e.target.value)}
              helperText="Token permanente do sistema (System User) recomendado." />
            {ligar.isError && <p className="text-sm text-red-600">{(ligar.error as Error).message}</p>}
            <Button type="submit" size="md" className="gap-2" isLoading={ligar.isPending} disabled={ligar.isPending || !phoneId.trim() || !token.trim()}>
              <Plug className="w-4 h-4" /> Ligar WhatsApp
            </Button>
          </form>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <MessageCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          Sem o WhatsApp ligado, a comunicação corre em <strong>modo simulado</strong> (nada é enviado).
          O webhook de entrada usa o <code>WHATSAPP_APP_SECRET</code> e o <code>WHATSAPP_VERIFY_TOKEN</code> do servidor.
        </p>
      </div>
    </div>
  )
}
