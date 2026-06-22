'use client'
import { useEffect }    from 'react'
import { useForm }      from 'react-hook-form'
import { zodResolver }  from '@hookform/resolvers/zod'
import { User, DoorOpen, Wrench, ChevronRight, ChevronLeft } from 'lucide-react'
import { step4RecursoSchema, type Step4RecursoInput } from '@/lib/validators/onboarding'
import { NICHE_TEMPLATE_MAP }  from '@/lib/niche-templates'
import { Button }              from '@/components/design-system/Button/Button'
import type { TenantNiche }    from '@/types/domain/tenant'
import type { SupportedLocale } from '@/types/domain/communication'

const COLORS = [
  '#6366f1', '#ec4899', '#14b8a6', '#f97316',
  '#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b',
]

const RESOURCE_TYPES = [
  { value: 'staff' as const,     label: 'Colaborador', icon: <User className="w-5 h-5" /> },
  { value: 'room' as const,      label: 'Sala/Cabine', icon: <DoorOpen className="w-5 h-5" /> },
  { value: 'equipment' as const, label: 'Equipamento', icon: <Wrench className="w-5 h-5" /> },
]

interface Props {
  niche?:         TenantNiche
  locale:         SupportedLocale
  defaultValues?: Partial<Step4RecursoInput>
  onNext:         (data: Step4RecursoInput) => void
  onBack:         () => void
  isLoading?:     boolean
}

export function Step4Recurso({ niche, locale, defaultValues, onNext, onBack, isLoading }: Props) {
  const template     = niche ? NICHE_TEMPLATE_MAP[niche] : undefined
  const primaryType  = template?.sample_resource_types[0] ?? 'staff'

  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<Step4RecursoInput>({
      resolver: zodResolver(step4RecursoSchema),
      defaultValues: {
        type:            primaryType,
        color:           '#6366f1',
        link_to_profile: true,
        ...defaultValues,
      },
    })

  const resourceType = watch('type')
  const color        = watch('color')
  const isHuman      = resourceType === 'staff'

  useEffect(() => {
    if (!isHuman) setValue('link_to_profile', false)
  }, [isHuman, setValue])

  const colaboradorLabel = locale === 'pt-BR' ? 'colaborador' : 'colaborador'

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      <div className="text-center mb-4">
        <div className="text-4xl mb-3">👤</div>
        <h2 className="text-xl font-bold text-gray-900">Primeiro recurso</h2>
        <p className="text-sm text-gray-500 mt-1">
          Quem ou o que executa os serviços?
        </p>
      </div>

      {/* Tipo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de recurso *</label>
        <div className="grid grid-cols-3 gap-2">
          {RESOURCE_TYPES.map((rt) => {
            const isSelected = resourceType === rt.value
            return (
              <button
                key={rt.value}
                type="button"
                onClick={() => setValue('type', rt.value, { shouldValidate: true })}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {rt.icon}
                <span className="text-xs font-medium">{rt.label}</span>
              </button>
            )
          })}
        </div>
        {errors.type && <p className="mt-1 text-xs text-red-600">{errors.type.message}</p>}
      </div>

      {/* Nome */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {isHuman ? `Nome do ${colaboradorLabel}` : 'Nome do recurso'} *
        </label>
        <input
          {...register('name')}
          type="text"
          placeholder={isHuman ? 'Ana Rodrigues' : 'Sala 1'}
          className="w-full h-12 px-4 rounded-xl border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
      </div>

      {/* Especialização */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {isHuman ? 'Especialização' : 'Descrição'} <span className="text-gray-400">(opcional)</span>
        </label>
        <input
          {...register('specialization')}
          type="text"
          placeholder={isHuman ? 'Esteticista' : 'Sala com equipamentos de estética'}
          className="w-full h-12 px-4 rounded-xl border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
      </div>

      {/* Vincular ao perfil — só para staff */}
      {isHuman && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <input
            {...register('link_to_profile')}
            id="link_to_profile"
            type="checkbox"
            className="mt-0.5 w-5 h-5 accent-blue-600 cursor-pointer"
          />
          <label htmlFor="link_to_profile" className="text-sm text-blue-800 cursor-pointer">
            <span className="font-medium">Sou eu este colaborador</span>
            <span className="block text-xs text-blue-600 mt-0.5">
              Vincula este recurso à sua conta — a sua agenda ficará filtrada automaticamente
            </span>
          </label>
        </div>
      )}

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
