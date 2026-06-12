'use client'
import React from 'react'
import { Lock } from 'lucide-react'
import { NICHE_TEMPLATE_MAP } from '@/lib/niche-templates'
import type { TenantNiche, SupportedLocale } from '@/types/domain'
import { getLabels } from '@/lib/i18n/labels'

const NICHE_LABELS: Record<TenantNiche, string> = {
  estetica:     'Estética',
  veterinaria:  'Veterinária',
  barbearia:    'Barbearia',
  dentista:     'Dentista',
  oficina:      'Oficina',
  fisioterapia: 'Fisioterapia',
  outro:        'Outro',
}

interface PainelTemplatesProps {
  locale: SupportedLocale
  niche?: TenantNiche
}

// Regra de produto: o cliente NÃO escolhe nem troca de template. O nicho é
// definido na criação da empresa (superadmin). Aqui é apenas visualização do
// template atribuído — sem botões de aplicar/trocar.
export function PainelTemplates({ locale, niche }: PainelTemplatesProps) {
  const labels   = getLabels(locale)
  const template = niche ? NICHE_TEMPLATE_MAP[niche] : undefined

  if (!template) {
    return (
      <p className="text-sm text-gray-600">
        Nenhum template associado a esta conta.
      </p>
    )
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-semibold text-gray-900">O seu template</h3>
        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
          <Lock className="w-3 h-3" /> Definido na criação da empresa
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        Template do seu sector, com serviços e recursos típicos. Para o alterar,
        contacte o suporte.
      </p>

      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
        <div className="flex items-center gap-3">
          <span
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ backgroundColor: template.color }}
          >
            {template.label.charAt(0)}
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900">{template.label}</p>
            <p className="text-xs text-gray-500">{NICHE_LABELS[template.id]}</p>
          </div>
        </div>
        <p className="text-xs text-gray-600">{template.description}</p>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Serviços típicos do sector:</p>
          <div className="space-y-1">
            {template.sample_services.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs text-gray-700">
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.name}
                </span>
                <span className="text-gray-500">{s.duration_minutes}min · {labels.currency}{s.price}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
