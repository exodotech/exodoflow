'use client'
import React, { useState }  from 'react'
import { useRouter }                    from 'next/navigation'
import { OnboardingStepper }   from '@/components/features/onboarding/OnboardingStepper'
import { Step1Empresa }        from '@/components/features/onboarding/steps/Step1Empresa'
import { Step2Nicho }          from '@/components/features/onboarding/steps/Step2Nicho'
import { Step3Servico }        from '@/components/features/onboarding/steps/Step3Servico'
import { Step4Recurso }        from '@/components/features/onboarding/steps/Step4Recurso'
import { Step5Disponibilidade } from '@/components/features/onboarding/steps/Step5Disponibilidade'
import { Step6Equipa }         from '@/components/features/onboarding/steps/Step6Equipa'
import { Step7Resumo }         from '@/components/features/onboarding/steps/Step7Resumo'
import { useAuth }             from '@/providers/AuthProvider'
import {
  useSalvarEmpresa,
  useConfirmarNicho,
  useCriarPrimeiroServico,
  useCriarPrimeiroRecurso,
  useCriarDisponibilidade,
  useCriarConvitesEquipa,
  useFinalizarOnboarding,
  useOnboardingState,
} from '@/hooks/useOnboarding'
import { useRecursos }         from '@/hooks/useRecursos'
import { countryToLocale }     from '@/lib/i18n/locale'
import type { OnboardingState }  from '@/types/domain/onboarding'
import type { TenantNiche, TenantCountry } from '@/types/domain/tenant'
import type { Step1EmpresaInput }         from '@/lib/validators/onboarding'
import type { Step3ServicoInput }         from '@/lib/validators/onboarding'
import type { Step4RecursoInput }         from '@/lib/validators/onboarding'
import type { Step5DisponibilidadeInput } from '@/lib/validators/onboarding'
import type { ConviteInput }              from '@/lib/validators/onboarding'

const TOTAL_STEPS = 7

export default function OnboardingPage() {
  const router     = useRouter()
  const { user, profile }  = useAuth()

  const [currentStep, setCurrentStep] = useState<number>(1)
  const [state, setState] = useState<OnboardingState>({
    step:      1,
    completed: false,
  })
  const [generalError, setGeneralError] = useState<string | null>(null)

  // País e nicho são definidos na criação da empresa (superadmin) e são imutáveis.
  // Carregamo-los da BD e usamo-los como valores BLOQUEADOS (sem setState/effect):
  // alimentam os ecrãs em modo leitura e a derivação do locale.
  const { data: tenantState } = useOnboardingState()
  const lockedCountry: TenantCountry = (tenantState?.country as TenantCountry) ?? 'PT'
  const lockedNiche = tenantState?.business_type as TenantNiche | undefined

  // Hooks de mutação
  const salvarEmpresa        = useSalvarEmpresa()
  const confirmarNicho       = useConfirmarNicho()
  const criarServico         = useCriarPrimeiroServico()
  const criarRecurso         = useCriarPrimeiroRecurso()
  const criarDisponibilidade = useCriarDisponibilidade()
  const criarConvites        = useCriarConvitesEquipa()
  const finalizar            = useFinalizarOnboarding()

  // Dados de recursos (para o passo 6)
  const { data: recursos = [] } = useRecursos()

  const locale = countryToLocale(state.empresa?.country ?? lockedCountry)

  const isLoading =
    salvarEmpresa.isPending ||
    confirmarNicho.isPending ||
    criarServico.isPending ||
    criarRecurso.isPending ||
    criarDisponibilidade.isPending ||
    criarConvites.isPending ||
    finalizar.isPending

  // ─── Handlers por passo ───────────────────────────────────────────────────

  const handleStep1 = async (data: Step1EmpresaInput) => {
    setGeneralError(null)
    try {
      await salvarEmpresa.mutateAsync(data)
      setState((prev) => ({ ...prev, empresa: data, step: 2 }))
      setCurrentStep(2)
    } catch (e) {
      setGeneralError(e instanceof Error ? e.message : 'Erro ao guardar empresa')
    }
  }

  const handleStep2 = async (niche: TenantNiche) => {
    setGeneralError(null)
    try {
      await confirmarNicho.mutateAsync()
      setState((prev) => ({ ...prev, niche, step: 3 }))
      setCurrentStep(3)
    } catch (e) {
      setGeneralError(e instanceof Error ? e.message : 'Erro ao avançar')
    }
  }

  const handleStep3 = async (data: Step3ServicoInput) => {
    setGeneralError(null)
    try {
      const servicoId = await criarServico.mutateAsync(data)
      setState((prev) => ({ ...prev, servico: data, servicoId, step: 4 }))
      setCurrentStep(4)
    } catch (e) {
      setGeneralError(e instanceof Error ? e.message : 'Erro ao criar serviço')
    }
  }

  const handleStep4 = async (data: Step4RecursoInput) => {
    setGeneralError(null)
    try {
      const ownerProfileId = profile?.id ?? ''
      const recursoId = await criarRecurso.mutateAsync({ input: data, ownerProfileId })
      setState((prev) => ({ ...prev, recurso: data, recursoId, step: 5 }))
      setCurrentStep(5)
    } catch (e) {
      setGeneralError(e instanceof Error ? e.message : 'Erro ao criar recurso')
    }
  }

  const handleStep5 = async (data: Step5DisponibilidadeInput) => {
    setGeneralError(null)
    try {
      const recursoId = state.recursoId ?? ''
      await criarDisponibilidade.mutateAsync({ input: data, resourceId: recursoId })
      setState((prev) => ({ ...prev, disponibilidade: data, step: 6 }))
      setCurrentStep(6)
    } catch (e) {
      setGeneralError(e instanceof Error ? e.message : 'Erro ao criar disponibilidade')
    }
  }

  const handleStep6 = async (convites: ConviteInput[]) => {
    setGeneralError(null)
    try {
      const invitedBy = user?.id ?? ''
      await criarConvites.mutateAsync({ convites, invitedBy })
      setState((prev) => ({ ...prev, equipa: { convites }, step: 7 }))
      setCurrentStep(7)
    } catch (e) {
      setGeneralError(e instanceof Error ? e.message : 'Erro ao criar convites')
    }
  }

  const handleFinalizar = async () => {
    setGeneralError(null)
    try {
      await finalizar.mutateAsync()
      router.push('/dashboard')
    } catch (e) {
      setGeneralError(e instanceof Error ? e.message : 'Erro ao finalizar onboarding')
    }
  }

  const goBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header da marca */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-blue-600">Exodo</span>
          <span className="text-2xl font-bold text-gray-900">Flow</span>
          <span className="ml-1 text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">AI</span>
        </div>
        <span className="text-xs text-gray-400">
          Passo {currentStep} de {TOTAL_STEPS}
        </span>
      </header>

      {/* Stepper */}
      <div className="bg-white border-b border-gray-100">
        <OnboardingStepper currentStep={currentStep} />
      </div>

      {/* Conteúdo do passo */}
      <main className="flex-1 flex items-start justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-lg">
          {/* Erro geral */}
          {generalError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-700">{generalError}</p>
            </div>
          )}

          {/* Passo 1 — Empresa */}
          {currentStep === 1 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <Step1Empresa
                defaultValues={state.empresa ?? { name: tenantState?.name ?? '', slug: '', country: lockedCountry }}
                onNext={handleStep1}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* Passo 2 — Nicho */}
          {currentStep === 2 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <Step2Nicho
                selected={state.niche ?? lockedNiche}
                locale={locale}
                onNext={handleStep2}
                onBack={goBack}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* Passo 3 — Serviço */}
          {currentStep === 3 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <Step3Servico
                niche={state.niche ?? lockedNiche}
                locale={locale}
                defaultValues={state.servico}
                onNext={handleStep3}
                onBack={goBack}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* Passo 4 — Recurso */}
          {currentStep === 4 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <Step4Recurso
                niche={state.niche ?? lockedNiche}
                locale={locale}
                defaultValues={state.recurso}
                onNext={handleStep4}
                onBack={goBack}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* Passo 5 — Disponibilidade */}
          {currentStep === 5 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <Step5Disponibilidade
                onNext={handleStep5}
                onBack={goBack}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* Passo 6 — Equipa */}
          {currentStep === 6 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <Step6Equipa
                recursos={recursos.map((r) => ({ id: r.id, name: r.name, type: r.type }))}
                onNext={handleStep6}
                onBack={goBack}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* Passo 7 — Resumo */}
          {currentStep === 7 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <Step7Resumo
                state={state}
                locale={locale}
                onFinalizar={handleFinalizar}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
