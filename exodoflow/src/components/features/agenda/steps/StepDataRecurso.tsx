'use client'
import React from 'react'

interface RecursoSimples { id: string; name: string; is_active: boolean; type: string | null }
interface ServicoSimples { requires_resource_type: string | null }

interface StepDataRecursoProps {
  date:      string
  recursoId: string
  recursos:  RecursoSimples[]
  servico:   ServicoSimples | undefined
  onChange:  (update: { date?: string; resource_id?: string; slot?: null }) => void
}

export function StepDataRecurso({ date, recursoId, recursos, servico, onChange }: StepDataRecursoProps) {
  const hoje = new Date().toISOString().split('T')[0]

  const recursosFiltrados = servico?.requires_resource_type
    ? recursos.filter((r) => r.is_active && r.type === servico.requires_resource_type)
    : recursos.filter((r) => r.is_active)

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Data <span className="text-red-600">*</span>
        </label>
        <input
          type="date"
          min={hoje}
          value={date}
          onChange={(e) => onChange({ date: e.target.value, slot: null })}
          className="w-full h-12 rounded-lg border border-gray-300 px-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Recurso / Profissional <span className="text-red-600">*</span>
        </label>
        {recursosFiltrados.length === 0 ? (
          <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
            Nenhum recurso activo disponível. Configure os recursos primeiro.
          </p>
        ) : (
          <select
            value={recursoId}
            onChange={(e) => onChange({ resource_id: e.target.value, slot: null })}
            className="w-full h-12 rounded-lg border border-gray-300 px-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar recurso...</option>
            {recursosFiltrados.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}
