'use client'
import React from 'react'
import { User, UserPlus, Zap, Check } from 'lucide-react'
import { useNicheTerms } from '@/hooks/useNicheTerms'
import { capitalize } from '@/lib/niche-templates'

export type TipoCliente = 'existente' | 'visitante' | 'rapida'

interface ClienteSimples { id: string; full_name: string; is_guest?: boolean }
interface ServicoSimples { id: string; name: string; duration_minutes: number; price: number | null; is_active: boolean }

interface StepClienteServicoProps {
  tipo:          TipoCliente
  clienteId:     string
  servicoId:     string
  clientes:      ClienteSimples[]
  servicos:      ServicoSimples[]
  visitanteNome?: string         // nome do visitante criado (quando tipo='visitante')
  allowQuick:    boolean         // permitir Marcação Rápida (config do tenant)
  onChangeTipo:  (t: TipoCliente) => void
  onChange:      (update: { client_id?: string; service_id?: string; slot?: null }) => void
  onCriarVisitante: () => void
}

export function StepClienteServico({
  tipo, clienteId, servicoId, clientes, servicos, visitanteNome, allowQuick,
  onChangeTipo, onChange, onCriarVisitante,
}: StepClienteServicoProps) {
  const terms = useNicheTerms()
  // Opções construídas com a terminologia do nicho (cliente/paciente/tutor).
  const OPCOES: { tipo: TipoCliente; label: string; desc: string; icon: typeof User }[] = [
    { tipo: 'existente', label: `${capitalize(terms.clientSingular)} existente`, desc: `Use um ${terms.clientSingular} já cadastrado.`, icon: User },
    { tipo: 'visitante', label: 'Visitante',         desc: 'Nome obrigatório, telefone opcional.',   icon: UserPlus },
    { tipo: 'rapida',    label: 'Marcação Rápida',   desc: 'Sem cadastro. Ideal para atendimento imediato.', icon: Zap },
  ]
  const opcoes = OPCOES.filter((o) => o.tipo !== 'rapida' || allowQuick)

  return (
    <div className="space-y-4">
      {/* Escolha do tipo de cliente */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de {terms.clientSingular}</label>
        <div className="grid grid-cols-1 gap-2">
          {opcoes.map((o) => {
            const Icon = o.icon
            const ativo = tipo === o.tipo
            return (
              <button
                key={o.tipo}
                type="button"
                onClick={() => onChangeTipo(o.tipo)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                  ativo ? 'border-[color:var(--tenant-primary)] bg-[color:var(--tenant-primary)]/5' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 ${ativo ? 'bg-[color:var(--tenant-primary)] text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-900">{o.label}</span>
                  <span className="block text-xs text-gray-500">{o.desc}</span>
                </span>
                {ativo && <Check className="w-4 h-4 text-[color:var(--tenant-primary)] ml-auto flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Conteúdo conforme o tipo */}
      {tipo === 'existente' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {capitalize(terms.clientSingular)} <span className="text-red-600">*</span>
          </label>
          <select
            value={clienteId}
            onChange={(e) => onChange({ client_id: e.target.value })}
            className="w-full h-12 rounded-lg border border-gray-300 px-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--tenant-primary)]"
          >
            <option value="">Seleccionar {terms.clientSingular}...</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}{c.is_guest ? ' (visitante)' : ''}</option>
            ))}
          </select>
        </div>
      )}

      {tipo === 'visitante' && (
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
          {clienteId && visitanteNome ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-gray-800">Visitante: <strong>{visitanteNome}</strong></span>
              <button type="button" onClick={onCriarVisitante} className="text-xs text-[color:var(--tenant-primary)] hover:underline">Trocar</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onCriarVisitante}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--tenant-primary)] hover:underline"
            >
              <UserPlus className="w-4 h-4" /> Criar visitante
            </button>
          )}
        </div>
      )}

      {tipo === 'rapida' && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <Zap className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            Marcação sem cliente identificado — não recolhe nome, telefone nem dados pessoais.
            Aparece na agenda como <strong>&quot;Marcação Rápida&quot;</strong>.
          </p>
        </div>
      )}

      {/* Serviço (comum a todos os tipos) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Serviço <span className="text-red-600">*</span>
        </label>
        <select
          value={servicoId}
          onChange={(e) => onChange({ service_id: e.target.value, slot: null })}
          className="w-full h-12 rounded-lg border border-gray-300 px-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--tenant-primary)]"
        >
          <option value="">Seleccionar serviço...</option>
          {servicos.filter((s) => s.is_active).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.duration_minutes} min{s.price != null ? ` (€${Number(s.price).toFixed(2)})` : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
