'use client'
import React from 'react'
import SectionHeader from '@/components/design-system/SectionHeader/SectionHeader'
import { Button }    from '@/components/design-system/Button/Button'
import AccessDenied  from '@/components/design-system/AccessDenied/AccessDenied'
import { usePermissions } from '@/hooks/usePermissions'
import type { SupportedLocale } from '@/types/domain'
import { getLabels }    from '@/lib/i18n/labels'

interface PainelPlanoProps {
  locale: SupportedLocale
}

export function PainelPlano({ locale }: PainelPlanoProps) {
  const { isManagerOrAbove } = usePermissions()
  const labels = getLabels(locale)

  return (
    <div className="max-w-2xl">
      {!isManagerOrAbove && (
        <AccessDenied
          title="Área de Billing Restrita"
          description="Apenas o proprietário e gestores podem ver os detalhes do plano e faturação."
        />
      )}
      {isManagerOrAbove && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <SectionHeader title="Plano Actual" />
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm font-semibold text-blue-900">Trial</p>
            <p className="text-xs text-blue-700 mt-1">A explorar o ExodoFlow AI gratuitamente</p>
          </div>
          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium text-gray-700">Funcionalidades incluídas:</p>
            {[
              'Agenda com ' + labels.marcacoes,
              'Gestão de clientes',
              'Serviços e recursos',
              'WhatsApp Simulator',
              'Comunicação simulada (PT/BR)',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-green-500">✓</span>
                {feature}
              </div>
            ))}
            {[
              'WhatsApp real (API Meta)',
              'IA para agendamento automático',
              'Relatórios avançados',
              'Multi-utilizadores',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm text-gray-400">
                <span>○</span>
                {feature}
                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full ml-auto">Em breve</span>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Button size="sm" disabled>Actualizar plano — em breve</Button>
          </div>
        </div>
      )}
    </div>
  )
}
