'use client'
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { Button } from '@/components/design-system/Button/Button'
import { NICHE_TEMPLATE_MAP } from '@/lib/niche-templates'
import type { TenantNiche }           from '@/types/domain/tenant'
import type { SupportedLocale }       from '@/types/domain/communication'

interface Props {
  selected?:  TenantNiche
  locale:     SupportedLocale
  onNext:     (niche: TenantNiche) => void
  onBack:     () => void
  isLoading?: boolean
}

// O nicho é definido na CRIAÇÃO da empresa (superadmin) e é imutável.
// Este passo apenas mostra o nicho atribuído e confirma para avançar.
export function Step2Nicho({ selected, locale, onNext, onBack, isLoading }: Props) {
  const template = selected ? NICHE_TEMPLATE_MAP[selected] : undefined
  const label    = template
    ? (locale === 'pt-BR' && template.labelBR ? template.labelBR : template.label)
    : '—'

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">🎯</div>
        <h2 className="text-xl font-bold text-gray-900">O seu tipo de negócio</h2>
        <p className="text-sm text-gray-500 mt-1">
          Definido na criação da empresa — usamos isto para sugerir serviços e recursos
        </p>
      </div>

      {/* Nicho atribuído — somente leitura */}
      <div className="flex items-start justify-between gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50">
        <div className="flex items-start gap-3">
          <span className="text-3xl">{template?.emoji ?? '🏢'}</span>
          <div>
            <p className="font-semibold text-sm text-gray-800">{label}</p>
            {template?.description && (
              <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
            )}
            {template && template.sample_services.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {template.sample_services.slice(0, 3).map((s) => (
                  <span
                    key={s.name}
                    className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <Lock className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
      </div>

      <p className="text-xs text-gray-500 text-center">
        Para alterar o nicho, contacte o suporte.
      </p>

      <Button
        type="button"
        size="lg"
        className="w-full gap-2"
        disabled={isLoading || !selected}
        onClick={() => selected && onNext(selected)}
      >
        {isLoading ? 'A guardar...' : 'Continuar'}
        {!isLoading && <ChevronRight className="w-5 h-5" />}
      </Button>

      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mx-auto"
      >
        <ChevronLeft className="w-4 h-4" /> Voltar
      </button>
    </div>
  )
}
