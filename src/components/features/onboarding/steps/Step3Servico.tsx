'use client'
import { useEffect }    from 'react'
import { useForm }      from 'react-hook-form'
import { zodResolver }  from '@hookform/resolvers/zod'
import { Scissors, ChevronRight, ChevronLeft } from 'lucide-react'
import { step3ServicoSchema, type Step3ServicoInput } from '@/lib/validators/onboarding'
import { NICHE_TEMPLATE_MAP } from '@/lib/niche-templates'
import { Button }             from '@/components/design-system/Button/Button'
import type { TenantNiche }   from '@/types/domain/tenant'
import type { SupportedLocale } from '@/types/domain/communication'

const COLORS = [
  '#6366f1', '#ec4899', '#14b8a6', '#f97316',
  '#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b',
]

const DURATIONS = [15, 20, 30, 45, 60, 90, 120]

interface Props {
  niche?:        TenantNiche
  locale:        SupportedLocale
  defaultValues?: Partial<Step3ServicoInput>
  onNext:        (data: Step3ServicoInput) => void
  onBack:        () => void
  isLoading?:    boolean
}

export function Step3Servico({ niche, locale, defaultValues, onNext, onBack, isLoading }: Props) {
  const template = niche ? NICHE_TEMPLATE_MAP[niche] : undefined
  const suggested = template?.sample_services[0]

  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<Step3ServicoInput>({
      resolver: zodResolver(step3ServicoSchema),
      defaultValues: {
        color:            suggested?.color ?? '#6366f1',
        duration_minutes: suggested?.duration_minutes ?? 60,
        price:            suggested?.price,
        is_active:        true,
        ...defaultValues,
      },
    })

  // Pré-preencher com a sugestão do nicho quando muda
  useEffect(() => {
    if (suggested && !defaultValues?.name) {
      setValue('name',             suggested.name)
      setValue('duration_minutes', suggested.duration_minutes)
      setValue('price',            suggested.price)
      setValue('color',            suggested.color)
    }
  }, [suggested, defaultValues?.name, setValue])

  const color = watch('color')
  const currencySymbol = locale === 'pt-BR' ? 'R$' : '€'
  const marcacaoLabel  = locale === 'pt-BR' ? 'agendamento' : 'marcação'

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-pink-100 rounded-full mb-3">
          <Scissors className="w-7 h-7 text-pink-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Primeiro serviço</h2>
        <p className="text-sm text-gray-500 mt-1">
          O serviço base para os seus {marcacaoLabel}s
        </p>
      </div>

      {/* Sugestões do nicho */}
      {template && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Sugestões para {template.label}:</p>
          <div className="flex flex-wrap gap-2">
            {template.sample_services.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => {
                  setValue('name',             s.name)
                  setValue('duration_minutes', s.duration_minutes)
                  setValue('price',            s.price)
                  setValue('color',            s.color)
                }}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Nome */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nome do serviço *</label>
        <input
          {...register('name')}
          type="text"
          placeholder="Limpeza de Pele"
          className="w-full h-12 px-4 rounded-xl border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
      </div>

      {/* Descrição */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descrição <span className="text-gray-400">(opcional)</span>
        </label>
        <textarea
          {...register('description')}
          rows={2}
          placeholder="Descrição breve do serviço..."
          className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
        />
      </div>

      {/* Duração + Preço */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Duração *</label>
          <select
            {...register('duration_minutes', { valueAsNumber: true })}
            className="w-full h-12 px-4 rounded-xl border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
          >
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d < 60 ? `${d} min` : `${d / 60}h${d % 60 ? `${d % 60}` : ''}`}
              </option>
            ))}
          </select>
          {errors.duration_minutes && (
            <p className="mt-1 text-xs text-red-600">{errors.duration_minutes.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preço ({currencySymbol}) <span className="text-gray-400">(opcional)</span>
          </label>
          <input
            {...register('price', { valueAsNumber: true })}
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            className="w-full h-12 px-4 rounded-xl border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
          />
          {errors.price && <p className="mt-1 text-xs text-red-600">{errors.price.message}</p>}
        </div>
      </div>

      {/* Cor */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Cor no calendário</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setValue('color', c)}
              className={`w-8 h-8 rounded-full border-2 transition-transform active:scale-90 ${
                color === c ? 'border-gray-800 scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <input type="hidden" {...register('color')} />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 px-4 h-12 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        <Button type="submit" size="lg" className="flex-1 gap-2" disabled={isLoading}>
          {isLoading ? 'A guardar...' : 'Continuar'}
          {!isLoading && <ChevronRight className="w-5 h-5" />}
        </Button>
      </div>
    </form>
  )
}
