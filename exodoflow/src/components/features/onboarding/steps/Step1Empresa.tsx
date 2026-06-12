'use client'
import { useForm }      from 'react-hook-form'
import { zodResolver }  from '@hookform/resolvers/zod'
import { Building2, ChevronRight, Lock } from 'lucide-react'
import { step1EmpresaSchema, type Step1EmpresaInput } from '@/lib/validators/onboarding'
import { Button } from '@/components/design-system/Button/Button'

interface Props {
  defaultValues?: Partial<Step1EmpresaInput>
  onNext: (data: Step1EmpresaInput) => void
  isLoading?: boolean
}

export function Step1Empresa({ defaultValues, onNext, isLoading }: Props) {
  // País é definido na criação da empresa (superadmin) — aqui é só leitura.
  // Como nunca muda, derivamo-lo dos defaultValues (sem watch reactivo).
  const country = defaultValues?.country ?? 'PT'

  const { register, handleSubmit, setValue, formState: { errors } } =
    useForm<Step1EmpresaInput>({
      resolver:      zodResolver(step1EmpresaSchema),
      defaultValues: { country, ...defaultValues },
    })

  // Auto-gera o slug a partir do nome
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
    setValue('slug', slug, { shouldValidate: false })
  }

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-3">
          <Building2 className="w-7 h-7 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Sobre a sua empresa</h2>
        <p className="text-sm text-gray-500 mt-1">Vamos começar com as informações básicas</p>
      </div>

      {/* País — somente leitura (definido na criação da empresa) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">País</label>
        <div className="flex items-center justify-between gap-2 p-4 rounded-xl border border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 font-medium text-sm text-gray-800">
            <span className="text-xl">{country === 'PT' ? '🇵🇹' : '🇧🇷'}</span>
            <span>{country === 'PT' ? 'Portugal' : 'Brasil'}</span>
          </div>
          <Lock className="w-4 h-4 text-gray-400" />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Definido na criação da empresa.{' '}
          {country === 'PT'
            ? 'Moeda: € (Euro) · Fuso: Europe/Lisbon · Língua: pt-PT'
            : 'Moeda: R$ (Real) · Fuso: America/Sao_Paulo · Língua: pt-BR'}
        </p>
      </div>

      {/* Nome da empresa */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome da empresa *
        </label>
        <input
          {...register('name', { onChange: handleNameChange })}
          type="text"
          placeholder={country === 'PT' ? 'Clínica Aurora' : 'Clínica Aurora Brasil'}
          className="w-full h-12 px-4 rounded-xl border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Slug */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Identificador URL *
        </label>
        <div className="flex items-center gap-0">
          <span className="flex items-center h-12 px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-xl text-gray-500 text-sm">
            exodoflow.ai/
          </span>
          <input
            {...register('slug')}
            type="text"
            placeholder="clinica-aurora"
            className="flex-1 h-12 px-3 rounded-r-xl border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
        {errors.slug && (
          <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">Apenas letras minúsculas, números e hífens</p>
      </div>

      {/* Telefone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {country === 'PT' ? 'Telemóvel' : 'Celular'} <span className="text-gray-400">(opcional)</span>
        </label>
        <input
          {...register('phone')}
          type="tel"
          placeholder={country === 'PT' ? '+351 912 345 678' : '+55 11 91234-5678'}
          className="w-full h-12 px-4 rounded-xl border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
        />
        {errors.phone && (
          <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
        )}
      </div>

      {/* E-mail */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          E-mail de contacto <span className="text-gray-400">(opcional)</span>
        </label>
        <input
          {...register('email')}
          type="email"
          placeholder="geral@clinicaaurora.pt"
          className="w-full h-12 px-4 rounded-xl border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
        )}
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full gap-2"
        disabled={isLoading}
      >
        {isLoading ? 'A guardar...' : 'Continuar'}
        {!isLoading && <ChevronRight className="w-5 h-5" />}
      </Button>
    </form>
  )
}
