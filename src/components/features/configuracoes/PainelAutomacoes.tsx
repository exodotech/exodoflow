'use client'
// Painel de automações — configura follow-ups, lembretes, reviews e campanhas
// automáticas. Configuração guardada em tenant.settings.automacoes.
import React, { useState } from 'react'
import { Bell, Loader2, RotateCcw, Star, Cake } from 'lucide-react'
import { Button }    from '@/components/design-system/Button/Button'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { usePermissions } from '@/hooks/usePermissions'
import AccessDenied       from '@/components/design-system/AccessDenied/AccessDenied'

interface AutomacoesConfig {
  lembrete_ativo:      boolean
  lembrete_horas:      number   // horas antes da marcação
  followup_ativo:      boolean
  followup_dias:       number   // dias após a visita
  reviews_ativo:       boolean
  reviews_horas:       number   // horas após a visita
  aniversario_ativo:   boolean
}

const DEFAULTS: AutomacoesConfig = {
  lembrete_ativo:    true,
  lembrete_horas:    24,
  followup_ativo:    true,
  followup_dias:     30,
  reviews_ativo:     false,
  reviews_horas:     2,
  aniversario_ativo: false,
}

async function carregarConfig(): Promise<AutomacoesConfig> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  if (!profile?.tenant_id) throw new Error('Tenant não encontrado')
  const { data: t } = await supabase.from('tenants').select('settings').eq('id', profile.tenant_id).single()
  const cfg = (t?.settings as { automacoes?: Partial<AutomacoesConfig> } | null)?.automacoes ?? {}
  return { ...DEFAULTS, ...cfg }
}

async function guardarConfig(cfg: AutomacoesConfig): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  if (!profile?.tenant_id) throw new Error('Tenant não encontrado')
  const { data: t } = await supabase.from('tenants').select('settings').eq('id', profile.tenant_id).single()
  const settings = (t?.settings ?? {}) as Record<string, unknown>
  await supabase.from('tenants').update({ settings: { ...settings, automacoes: cfg } }).eq('id', profile.tenant_id)
}

export function PainelAutomacoes() {
  const { isManagerOrAbove } = usePermissions()
  const qc = useQueryClient()

  const { data: cfg, isLoading } = useQuery({ queryKey: ['automacoes-config'], queryFn: carregarConfig })
  const [local, setLocal] = useState<AutomacoesConfig | null>(null)
  const [guardado, setGuardado] = useState(false)

  const atual = local ?? cfg ?? DEFAULTS

  const guardar = useMutation({
    mutationFn: guardarConfig,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['automacoes-config'] })
      setGuardado(true)
      setTimeout(() => setGuardado(false), 2000)
    },
  })

  if (!isManagerOrAbove) {
    return <AccessDenied title="Área Restrita" description="Apenas gestores e proprietários podem configurar automações." />
  }

  function atualizar<K extends keyof AutomacoesConfig>(key: K, value: AutomacoesConfig[K]) {
    setLocal((prev) => ({ ...(prev ?? atual), [key]: value }))
  }

  return (
    <div className="max-w-2xl space-y-6">

      {/* Lembretes automáticos */}
      <AutomacaoCard
        icon={<Bell className="w-5 h-5 text-blue-500" />}
        titulo="Lembrete antes da marcação"
        descricao="Envia mensagem automática ao cliente antes da marcação."
        ativo={atual.lembrete_ativo}
        onToggle={(v) => atualizar('lembrete_ativo', v)}
        isLoading={isLoading}
      >
        <ConfigNumero
          label="Horas antes de enviar"
          value={atual.lembrete_horas}
          min={1} max={72}
          onChange={(v) => atualizar('lembrete_horas', v)}
          disabled={!atual.lembrete_ativo}
        />
      </AutomacaoCard>

      {/* Follow-up pós-visita */}
      <AutomacaoCard
        icon={<RotateCcw className="w-5 h-5 text-purple-500" />}
        titulo="Follow-up pós-visita"
        descricao="Lembra o cliente de remarcar quando passa o tempo certo desde a última visita."
        ativo={atual.followup_ativo}
        onToggle={(v) => atualizar('followup_ativo', v)}
        isLoading={isLoading}
      >
        <ConfigNumero
          label="Dias após a visita"
          value={atual.followup_dias}
          min={7} max={180}
          onChange={(v) => atualizar('followup_dias', v)}
          disabled={!atual.followup_ativo}
        />
      </AutomacaoCard>

      {/* Pedido de review */}
      <AutomacaoCard
        icon={<Star className="w-5 h-5 text-amber-500" />}
        titulo="Pedido de avaliação"
        descricao="Pede ao cliente que deixe uma avaliação no Google após a visita."
        ativo={atual.reviews_ativo}
        onToggle={(v) => atualizar('reviews_ativo', v)}
        isLoading={isLoading}
      >
        <ConfigNumero
          label="Horas após a visita"
          value={atual.reviews_horas}
          min={1} max={48}
          onChange={(v) => atualizar('reviews_horas', v)}
          disabled={!atual.reviews_ativo}
        />
      </AutomacaoCard>

      {/* Campanha de aniversário */}
      <AutomacaoCard
        icon={<Cake className="w-5 h-5 text-pink-500" />}
        titulo="Campanha de aniversário"
        descricao="Envia mensagem especial (ex: desconto) no dia de aniversário do cliente."
        ativo={atual.aniversario_ativo}
        onToggle={(v) => atualizar('aniversario_ativo', v)}
        isLoading={isLoading}
      />

      {/* Botão Guardar */}
      {local && (
        <div className="flex items-center gap-3">
          <Button
            onClick={() => guardar.mutate(atual)}
            disabled={guardar.isPending}
          >
            {guardar.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> A guardar...</> : guardado ? '✓ Guardado' : 'Guardar alterações'}
          </Button>
          <button
            onClick={() => setLocal(null)}
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            Cancelar
          </button>
        </div>
      )}

      <p className="text-xs text-slate-400">
        As automações são executadas via WhatsApp ou e-mail, conforme o canal configurado em Comunicação. Em ambiente de demonstração, os envios são simulados.
      </p>
    </div>
  )
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

function AutomacaoCard({
  icon, titulo, descricao, ativo, onToggle, isLoading, children,
}: {
  icon: React.ReactNode
  titulo: string
  descricao: string
  ativo: boolean
  onToggle: (v: boolean) => void
  isLoading?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className={`bg-white/70 backdrop-blur-sm rounded-xl border shadow-sm p-5 transition-colors ${ativo ? 'border-[color:var(--tenant-primary)]/30' : 'border-white/60'}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mt-0.5">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-1">
            <p className="text-sm font-semibold text-slate-900">{titulo}</p>
            <Toggle checked={ativo} onChange={onToggle} disabled={isLoading} />
          </div>
          <p className="text-xs text-slate-500">{descricao}</p>
          {ativo && children && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 ${
        checked ? 'bg-[color:var(--tenant-primary)]' : 'bg-slate-200'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  )
}

function ConfigNumero({ label, value, min, max, onChange, disabled }: {
  label: string; value: number; min: number; max: number
  onChange: (v: number) => void; disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-slate-600 flex-1">{label}</label>
      <input
        type="number"
        min={min} max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
        className="w-20 h-8 text-sm text-center border border-slate-200 rounded-lg disabled:opacity-40 focus:outline-none focus:border-[color:var(--tenant-primary)]"
      />
    </div>
  )
}
