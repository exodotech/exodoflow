'use client'
import { useState }    from 'react'
import { Clock, Plus, Trash2, ChevronRight, ChevronLeft } from 'lucide-react'
import { Button }      from '@/components/design-system/Button/Button'
import type { HorarioInput, Step5DisponibilidadeInput } from '@/lib/validators/onboarding'
import { step5DisponibilidadeSchema }                   from '@/lib/validators/onboarding'

// Convenção PostgreSQL EXTRACT(DOW): 0=Domingo, 1=Segunda ... 6=Sábado
// Ordem de exibição: Segunda → Domingo (semana útil primeiro)
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const

const DAY_LABELS: Record<number, string> = {
  0: 'Domingo', 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado',
}

const DEFAULT_START = '09:00'
const DEFAULT_END   = '18:00'

// Gera os 5 dias úteis como default
function defaultWeekdays(): HorarioInput[] {
  return [1, 2, 3, 4, 5].map((d) => ({
    day_of_week: d,
    start_time:  DEFAULT_START,
    end_time:    DEFAULT_END,
  }))
}

interface Props {
  onNext:     (data: Step5DisponibilidadeInput) => void
  onBack:     () => void
  isLoading?: boolean
}

export function Step5Disponibilidade({ onNext, onBack, isLoading }: Props) {
  const [horarios, setHorarios] = useState<HorarioInput[]>(defaultWeekdays)
  const [errors, setErrors]     = useState<string[]>([])

  const updateHorario = (index: number, field: keyof HorarioInput, value: string | number) => {
    setHorarios((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: value } : h))
    )
  }

  const removeHorario = (index: number) => {
    setHorarios((prev) => prev.filter((_, i) => i !== index))
  }

  const addHorario = () => {
    const usedDays = new Set(horarios.map((h) => h.day_of_week))
    const nextDay  = DAY_ORDER.find((d) => !usedDays.has(d)) ?? 1
    setHorarios((prev) => [
      ...prev,
      { day_of_week: nextDay, start_time: DEFAULT_START, end_time: DEFAULT_END },
    ])
  }

  const handleSubmit = () => {
    const result = step5DisponibilidadeSchema.safeParse({ horarios })
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message)
      setErrors([...new Set(msgs)])
      return
    }
    setErrors([])
    onNext(result.data)
  }

  return (
    <div className="space-y-5">
      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-100 rounded-full mb-3">
          <Clock className="w-7 h-7 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Horário de funcionamento</h2>
        <p className="text-sm text-gray-500 mt-1">
          Dias e horas em que aceita {horarios.length > 0 ? 'marcações' : 'agendamentos'}
        </p>
      </div>

      <div className="space-y-3">
        {horarios.map((h, index) => (
          <div
            key={index}
            className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-200"
          >
            {/* Dia da semana */}
            <select
              value={h.day_of_week}
              onChange={(e) => updateHorario(index, 'day_of_week', parseInt(e.target.value))}
              className="flex-1 min-w-0 h-10 px-2 rounded-lg border border-gray-200 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DAY_ORDER.map((d) => (
                <option key={d} value={d}>{DAY_LABELS[d]}</option>
              ))}
            </select>

            {/* Hora início */}
            <input
              type="time"
              value={h.start_time}
              onChange={(e) => updateHorario(index, 'start_time', e.target.value)}
              className="w-24 h-10 px-2 rounded-lg border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <span className="text-gray-400 text-xs">até</span>

            {/* Hora fim */}
            <input
              type="time"
              value={h.end_time}
              onChange={(e) => updateHorario(index, 'end_time', e.target.value)}
              className="w-24 h-10 px-2 rounded-lg border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Remover */}
            <button
              type="button"
              onClick={() => removeHorario(index)}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Adicionar dia */}
      {horarios.length < 7 && (
        <button
          type="button"
          onClick={addHorario}
          className="flex items-center gap-2 w-full py-3 px-4 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Adicionar dia
        </button>
      )}

      {/* Erros de validação */}
      {errors.length > 0 && (
        <div className="p-3 bg-red-50 rounded-xl border border-red-100">
          {errors.map((e, i) => (
            <p key={i} className="text-xs text-red-600">{e}</p>
          ))}
        </div>
      )}

      {/* Nota */}
      <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
        💡 Pode ajustar os horários de cada colaborador individualmente depois do onboarding.
      </p>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 px-4 h-12 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        <Button
          type="button"
          size="lg"
          className="flex-1 gap-2"
          disabled={isLoading || horarios.length === 0}
          onClick={handleSubmit}
        >
          {isLoading ? 'A guardar...' : 'Continuar'}
          {!isLoading && <ChevronRight className="w-5 h-5" />}
        </Button>
      </div>
    </div>
  )
}
