'use client'
import React from 'react'
import { Zap } from 'lucide-react'

interface ClienteSimples { id: string; full_name: string; is_guest?: boolean }
interface ServicoSimples { id: string; name: string; duration_minutes: number; price: number | null; is_active: boolean }

interface StepClienteServicoProps {
  clienteId: string
  servicoId: string
  clientes:  ClienteSimples[]
  servicos:  ServicoSimples[]
  onChange:  (update: { client_id?: string; service_id?: string; slot?: null }) => void
  onCriarVisitante?: () => void   // abre o modal de cliente rápido (opcional)
}

export function StepClienteServico({ clienteId, servicoId, clientes, servicos, onChange, onCriarVisitante }: StepClienteServicoProps) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            Cliente <span className="text-red-600">*</span>
          </label>
          {onCriarVisitante && (
            <button
              type="button"
              onClick={onCriarVisitante}
              className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--tenant-primary)] hover:underline"
            >
              <Zap className="w-3.5 h-3.5" /> Cliente rápido
            </button>
          )}
        </div>
        <select
          value={clienteId}
          onChange={(e) => onChange({ client_id: e.target.value })}
          className="w-full h-12 rounded-lg border border-gray-300 px-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccionar cliente...</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.full_name}{c.is_guest ? ' (visitante)' : ''}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Serviço <span className="text-red-600">*</span>
        </label>
        <select
          value={servicoId}
          onChange={(e) => onChange({ service_id: e.target.value, slot: null })}
          className="w-full h-12 rounded-lg border border-gray-300 px-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
