'use client'
import { useState }    from 'react'
import { Users, Plus, Trash2, ChevronRight, ChevronLeft, Mail } from 'lucide-react'
import { Button }      from '@/components/design-system/Button/Button'
import { conviteSchema, type ConviteInput } from '@/lib/validators/onboarding'

const ROLE_LABELS: Record<string, string> = {
  manager:     'Gestor',
  receptionist: 'Recepcionista',
  staff:       'Colaborador (STAFF)',
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  manager:      'Gestão operacional completa',
  receptionist: 'Agenda e clientes',
  staff:        'Apenas a própria agenda',
}

interface Props {
  recursos: Array<{ id: string; name: string; type: string }>
  onNext:     (convites: ConviteInput[]) => void
  onBack:     () => void
  isLoading?: boolean
}

interface ConviteLocal {
  email:       string
  role:        'manager' | 'receptionist' | 'staff'
  resource_id?: string
  error?:      string
}

export function Step6Equipa({ recursos, onNext, onBack, isLoading }: Props) {
  const [convites, setConvites] = useState<ConviteLocal[]>([])

  const humanRecursos = recursos.filter((r) => r.type === 'staff')

  const addConvite = () => {
    setConvites((prev) => [
      ...prev,
      { email: '', role: 'receptionist' },
    ])
  }

  const updateConvite = (index: number, field: keyof ConviteLocal, value: string) => {
    setConvites((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value, error: undefined } : c))
    )
  }

  const removeConvite = (index: number) => {
    setConvites((prev) => prev.filter((_, i) => i !== index))
  }

  const handleNext = () => {
    // Validar cada convite
    let hasError = false
    const validated = convites.map((c) => {
      const result = conviteSchema.safeParse(c)
      if (!result.success) {
        hasError = true
        return { ...c, error: result.error.issues[0]?.message ?? 'Inválido' }
      }
      return c
    })

    if (hasError) {
      setConvites(validated)
      return
    }

    // Convites válidos (sem o campo error)
    onNext(convites.map(({ email, role, resource_id }) => ({
      email,
      role,
      resource_id: resource_id || undefined,
    })))
  }

  return (
    <div className="space-y-5">
      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-purple-100 rounded-full mb-3">
          <Users className="w-7 h-7 text-purple-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Convidar equipa</h2>
        <p className="text-sm text-gray-500 mt-1">
          Opcional — pode fazer isto mais tarde nas configurações
        </p>
      </div>

      {/* Nota "em breve" */}
      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
        <span className="text-amber-500 text-sm mt-0.5">⚠️</span>
        <p className="text-xs text-amber-800">
          <span className="font-medium">Envio de e-mail em breve.</span> Os convites são registados
          e podem ser reenviados após o lançamento do módulo de e-mail.
        </p>
      </div>

      {/* Lista de convites */}
      <div className="space-y-3">
        {convites.map((convite, index) => (
          <div
            key={index}
            className="p-4 bg-white rounded-xl border border-gray-200 space-y-3"
          >
            {/* E-mail */}
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="email"
                value={convite.email}
                onChange={(e) => updateConvite(index, 'email', e.target.value)}
                placeholder="colaborador@empresa.com"
                className="flex-1 h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => removeConvite(index)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Role */}
            <div className="grid grid-cols-3 gap-1.5">
              {(['manager', 'receptionist', 'staff'] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => updateConvite(index, 'role', role)}
                  className={`flex flex-col p-2 rounded-lg border text-left transition-all ${
                    convite.role === role
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <span className={`text-xs font-semibold ${convite.role === role ? 'text-blue-700' : 'text-gray-700'}`}>
                    {ROLE_LABELS[role]}
                  </span>
                  <span className="text-[10px] text-gray-500 mt-0.5">
                    {ROLE_DESCRIPTIONS[role]}
                  </span>
                </button>
              ))}
            </div>

            {/* Recurso — obrigatório para STAFF */}
            {convite.role === 'staff' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Recurso associado *
                  <span className="ml-1 text-gray-400 font-normal">(obrigatório para STAFF)</span>
                </label>
                <select
                  value={convite.resource_id ?? ''}
                  onChange={(e) => updateConvite(index, 'resource_id', e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um colaborador...</option>
                  {humanRecursos.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                {humanRecursos.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    Nenhum recurso de tipo Colaborador encontrado.
                    Crie primeiro um recurso STAFF para poder convidar utilizadores com este role.
                  </p>
                )}
              </div>
            )}

            {/* Erro de validação */}
            {convite.error && (
              <p className="text-xs text-red-600">{convite.error}</p>
            )}
          </div>
        ))}
      </div>

      {/* Adicionar convite */}
      {convites.length < 10 && (
        <button
          type="button"
          onClick={addConvite}
          className="flex items-center gap-2 w-full py-3 px-4 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Adicionar membro
        </button>
      )}

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
          disabled={isLoading}
          onClick={handleNext}
        >
          {isLoading ? 'A guardar...' : convites.length === 0 ? 'Saltar este passo' : 'Continuar'}
          {!isLoading && <ChevronRight className="w-5 h-5" />}
        </Button>
      </div>
    </div>
  )
}
