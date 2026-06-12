'use client'
import { useState } from 'react'
import { CheckCircle2, Building2, Target, Scissors, User, Clock, Users, ChevronRight, Palette, ChevronDown } from 'lucide-react'
import { Button }   from '@/components/design-system/Button/Button'
import { ColorPicker } from '@/components/features/branding/ColorPicker'
import { ThemePicker } from '@/components/features/branding/ThemePicker'
import { NICHE_TEMPLATE_MAP } from '@/lib/niche-templates'
import { useSalvarBranding }  from '@/hooks/useBranding'
import { DEFAULT_PRIMARY_COLOR, DEFAULT_THEME_MODE } from '@/types/domain/tenant'
import type { ThemeMode }        from '@/types/domain/tenant'
import type { OnboardingState }  from '@/types/domain/onboarding'
import type { SupportedLocale }  from '@/types/domain/communication'

// Convenção PostgreSQL EXTRACT(DOW): 0=Domingo ... 6=Sábado
const DAY_SHORT: Record<number, string> = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb',
}

interface Props {
  state:      OnboardingState
  locale:     SupportedLocale
  onFinalizar: () => void
  isLoading?:  boolean
}

interface SummaryRowProps {
  icon:     React.ReactNode
  label:    string
  value:    string
  color:    string
  colorBg:  string
}

function SummaryRow({ icon, label, value, color, colorBg }: SummaryRowProps) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl ${colorBg}`}>
      <div className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full ${color} text-white`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-800 truncate">{value}</p>
      </div>
      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 ml-auto" />
    </div>
  )
}

export function Step7Resumo({ state, locale, onFinalizar, isLoading }: Props) {
  const nicheTemplate = state.niche ? NICHE_TEMPLATE_MAP[state.niche] : undefined
  const nicheLabel    = nicheTemplate ? (locale === 'pt-BR' && nicheTemplate.labelBR ? nicheTemplate.labelBR : nicheTemplate.label) : '—'
  const currencySymbol = locale === 'pt-BR' ? 'R$' : '€'
  const country = state.empresa?.country

  const horarios = state.disponibilidade?.horarios ?? []
  const horarioResumo = horarios.length > 0
    ? horarios.map((h) => `${DAY_SHORT[h.day_of_week]} ${h.start_time}–${h.end_time}`).join(' · ')
    : 'Não configurados'

  const convites = state.equipa?.convites ?? []

  // Branding opcional — não bloqueia a finalização
  const [brandingOpen,    setBrandingOpen]    = useState(false)
  const [primaryColor,    setPrimaryColor]    = useState(DEFAULT_PRIMARY_COLOR)
  const [themeMode,       setThemeMode]       = useState<ThemeMode>(DEFAULT_THEME_MODE)
  const [brandingSaved,   setBrandingSaved]   = useState(false)
  const salvarBranding = useSalvarBranding()

  async function handleSaveBranding() {
    await salvarBranding.mutateAsync({
      primary_color: primaryColor,
      theme_mode:    themeMode,
      logo_url:      '',
    })
    setBrandingSaved(true)
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-5xl mb-3">🎉</div>
        <h2 className="text-xl font-bold text-gray-900">Tudo pronto!</h2>
        <p className="text-sm text-gray-500 mt-1">
          Confirme o resumo e inicie a sua conta
        </p>
      </div>

      {/* Resumo */}
      <div className="space-y-2">
        {state.empresa && (
          <SummaryRow
            icon={<Building2 className="w-4 h-4" />}
            label="Empresa"
            value={`${state.empresa.name} · ${country === 'PT' ? '🇵🇹 Portugal' : '🇧🇷 Brasil'}`}
            color="bg-blue-500"
            colorBg="bg-blue-50"
          />
        )}

        {state.niche && (
          <SummaryRow
            icon={<Target className="w-4 h-4" />}
            label="Tipo de negócio"
            value={`${nicheTemplate?.emoji ?? ''} ${nicheLabel}`}
            color="bg-indigo-500"
            colorBg="bg-indigo-50"
          />
        )}

        {state.servico && (
          <SummaryRow
            icon={<Scissors className="w-4 h-4" />}
            label="Primeiro serviço"
            value={`${state.servico.name} · ${state.servico.duration_minutes}min${state.servico.price ? ` · ${currencySymbol}${state.servico.price}` : ''}`}
            color="bg-pink-500"
            colorBg="bg-pink-50"
          />
        )}

        {state.recurso && (
          <SummaryRow
            icon={<User className="w-4 h-4" />}
            label="Primeiro recurso"
            value={`${state.recurso.name}${state.recurso.specialization ? ` · ${state.recurso.specialization}` : ''}`}
            color="bg-teal-500"
            colorBg="bg-teal-50"
          />
        )}

        {horarios.length > 0 && (
          <SummaryRow
            icon={<Clock className="w-4 h-4" />}
            label="Horários"
            value={horarioResumo}
            color="bg-amber-500"
            colorBg="bg-amber-50"
          />
        )}

        {convites.length > 0 && (
          <SummaryRow
            icon={<Users className="w-4 h-4" />}
            label="Convites"
            value={`${convites.length} membro(s) convidado(s)`}
            color="bg-purple-500"
            colorBg="bg-purple-50"
          />
        )}
      </div>

      {/* Branding opcional */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setBrandingOpen(!brandingOpen)}
          className="flex w-full items-center justify-between p-4 text-left bg-white hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Personalizar aparência</span>
            <span className="text-xs text-gray-400">(opcional)</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${brandingOpen ? 'rotate-180' : ''}`} />
        </button>

        {brandingOpen && (
          <div className="p-4 border-t border-gray-100 bg-white space-y-4">
            <ColorPicker
              label="Cor principal da empresa"
              value={primaryColor}
              onChange={setPrimaryColor}
            />
            <ThemePicker value={themeMode} onChange={setThemeMode} />
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                isLoading={salvarBranding.isPending}
                onClick={handleSaveBranding}
              >
                Guardar aparência
              </Button>
              {brandingSaved && (
                <span className="text-xs text-green-600">Guardado!</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Próximos passos */}
      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
        <p className="text-xs font-semibold text-gray-700 mb-2">📋 Próximos passos</p>
        <ul className="space-y-1 text-xs text-gray-600">
          <li>• Adicione mais serviços em <strong>Serviços</strong></li>
          <li>• Configure horários detalhados em <strong>Recursos</strong></li>
          <li>• Crie a primeira marcação em <strong>Agenda</strong></li>
          {convites.length === 0 && (
            <li>• Convide a sua equipa em <strong>Configurações → Equipa</strong></li>
          )}
        </ul>
      </div>

      <Button
        type="button"
        size="lg"
        className="w-full gap-2"
        disabled={isLoading}
        onClick={onFinalizar}
      >
        {isLoading ? 'A finalizar...' : 'Entrar no ExodoFlow AI'}
        {!isLoading && <ChevronRight className="w-5 h-5" />}
      </Button>
    </div>
  )
}
