'use client'
import React from 'react'
import { Lock, Users, Briefcase } from 'lucide-react'
import { NICHE_TEMPLATE_MAP, capitalize, type ResourceType } from '@/lib/niche-templates'
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

const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  staff:     'Profissional',
  room:      'Sala / espaço',
  equipment: 'Equipamento',
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

      <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm p-5 space-y-3">
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
        <p className="text-xs italic text-gray-500">“{template.tagline}”</p>

        {/* Terminologia do sector — como a app trata quem marca */}
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-600">
            <Users className="w-3 h-3" /> Trata por: <strong className="font-semibold text-gray-800">{capitalize(template.terms.clientPlural)}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-600">
            <Briefcase className="w-3 h-3" /> Quem atende: <strong className="font-semibold text-gray-800">{template.terms.professional}</strong>
          </span>
          {template.terms.subject && (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-600">
              Acompanha: <strong className="font-semibold text-gray-800">{template.terms.subject}</strong>
            </span>
          )}
        </div>

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

        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Recursos típicos do sector:</p>
          <div className="flex flex-wrap gap-1.5">
            {template.sample_resources.map((r) => (
              <span key={r.name} className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg bg-white border border-gray-200 text-gray-700">
                {r.name}
                <span className="text-[10px] text-gray-400">{RESOURCE_TYPE_LABELS[r.type]}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
