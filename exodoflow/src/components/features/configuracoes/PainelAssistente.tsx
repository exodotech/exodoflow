'use client'
// Assistente virtual de WhatsApp — config + tester. Responde a perguntas comuns
// (serviços, preços, horários, morada, marcações) com os dados do tenant.
// NUNCA marca sozinho. Hoje em modo simulado; liga a IA real com a chave depois.
import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Bot, Send, Sparkles } from 'lucide-react'
import SectionHeader from '@/components/design-system/SectionHeader/SectionHeader'
import { Button }    from '@/components/design-system/Button/Button'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth }        from '@/providers/AuthProvider'
import { guardarAssistenteAtivo } from '@/services/agenda-config'
import type { TenantSettings } from '@/types/domain/tenant'

interface Troca { de: 'cliente' | 'bot'; texto: string; mode?: string }

export function PainelAssistente() {
  const { isOwner } = usePermissions()
  const { tenant, refreshTenant } = useAuth()
  const settings = tenant?.settings as TenantSettings | null | undefined

  const [ativo, setAtivo] = useState(settings?.assistant?.enabled === true)
  const guardar = useMutation({
    mutationFn: (v: boolean) => guardarAssistenteAtivo(v),
    onSuccess:  () => { void refreshTenant() },
  })
  function toggle() {
    if (!isOwner || guardar.isPending) return
    const novo = !ativo; setAtivo(novo); guardar.mutate(novo)
  }

  // Tester
  const [msg, setMsg] = useState('')
  const [trocas, setTrocas] = useState<Troca[]>([])
  const testar = useMutation({
    mutationFn: async (texto: string) => {
      const r = await fetch('/api/assistant/responder', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: texto }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Erro')
      return d as { reply: string; mode: string }
    },
    onSuccess: (d, texto) => setTrocas((t) => [...t, { de: 'cliente', texto }, { de: 'bot', texto: d.reply, mode: d.mode }]),
  })
  function enviar() {
    const t = msg.trim(); if (!t || testar.isPending) return
    setMsg(''); testar.mutate(t)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm p-6">
        <SectionHeader title="Assistente virtual" />
        <p className="text-sm text-gray-500 mt-1 mb-4">
          Responde automaticamente a perguntas comuns no WhatsApp (serviços, preços, horários,
          morada, marcações) quando a equipa está ocupada. <strong>Nunca marca sozinho</strong> —
          informa e direciona para o portal ou para a equipa.
        </p>

        <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50/60 border border-slate-100 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex-shrink-0"><Bot className="w-4 h-4" /></span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">Ativar assistente automático</p>
              <p className="text-xs text-slate-500">Aplica-se quando o WhatsApp real estiver ligado.</p>
            </div>
          </div>
          <button
            type="button" role="switch" aria-checked={ativo} onClick={toggle} disabled={guardar.isPending || !isOwner}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50 ${ativo ? 'bg-[color:var(--tenant-primary)]' : 'bg-slate-300'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ${ativo ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {!isOwner && <p className="text-xs text-slate-400">Só o proprietário pode ativar/desativar.</p>}

        <div className="flex items-center gap-1.5 text-xs text-violet-600 mt-1">
          <Sparkles className="w-3.5 h-3.5" />
          Modo simulado — quando adicionar a chave de IA, as respostas ficam ainda mais naturais.
        </div>
      </div>

      {/* Tester */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm p-6">
        <SectionHeader title="Testar o assistente" />
        <p className="text-sm text-gray-500 mt-1 mb-3">Escreva uma pergunta como um cliente faria.</p>

        <div className="space-y-2 mb-3 max-h-72 overflow-y-auto">
          {trocas.length === 0 && (
            <p className="text-xs text-slate-400 italic">Ex: &quot;que serviços fazem?&quot;, &quot;quanto custa?&quot;, &quot;quero marcar&quot;</p>
          )}
          {trocas.map((t, i) => (
            <div key={i} className={`flex ${t.de === 'cliente' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${t.de === 'cliente' ? 'bg-[color:var(--tenant-primary)] text-white' : 'bg-slate-100 text-slate-800'}`}>
                {t.texto}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') enviar() }}
            placeholder="Escreva uma mensagem..."
            className="flex-1 h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--tenant-primary)]"
          />
          <Button size="sm" onClick={enviar} isLoading={testar.isPending} disabled={testar.isPending || !msg.trim()} className="gap-1.5">
            <Send className="w-4 h-4" /> Enviar
          </Button>
        </div>
        {testar.isError && <p className="text-xs text-red-600 mt-2">{(testar.error as Error).message}</p>}
      </div>
    </div>
  )
}
