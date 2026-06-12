'use client'
import React from 'react'
import SectionHeader from '@/components/design-system/SectionHeader/SectionHeader'
import { getLabels }    from '@/lib/i18n/labels'
import { getTaxIdLabel } from '@/lib/i18n/tax-id'
import type { SupportedLocale } from '@/types/domain'

interface PainelLocalizacaoProps {
  locale:   SupportedLocale
  settings: { timezone: string; currency: string } | null
}

export function PainelLocalizacao({ locale, settings }: PainelLocalizacaoProps) {
  const labels = getLabels(locale)

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SectionHeader title="Localização e Idioma" />
        <div className="space-y-4 mt-4">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Mercado</p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                {locale === 'pt-BR' ? '🇧🇷 Brasil' : '🇵🇹 Portugal'}
              </span>
              <span className="text-xs text-gray-400">{locale}</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Fuso horário</p>
            <p className="text-sm text-gray-900">{settings?.timezone ?? 'Europe/Lisbon'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Moeda</p>
            <p className="text-sm text-gray-900">{labels.currency} — {labels.currencyName}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Identificação fiscal</p>
            <p className="text-sm text-gray-900">{getTaxIdLabel(locale)} — {locale === 'pt-BR' ? 'CPF / CNPJ' : 'NIF'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Terminologia de agenda</p>
            <p className="text-sm text-gray-900 capitalize">{labels.marcacoes}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{labels.telemovel.charAt(0).toUpperCase() + labels.telemovel.slice(1)}</p>
            <p className="text-sm text-gray-900 capitalize">{labels.telemovel}</p>
          </div>
        </div>
        <div className="mt-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600">
            O idioma, a moeda e o fuso horário seguem o país da empresa, que é
            definido na criação da conta. Para mudar o mercado, contacte o suporte.
          </p>
        </div>
      </div>
    </div>
  )
}
