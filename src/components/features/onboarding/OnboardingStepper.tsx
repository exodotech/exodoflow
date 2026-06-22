'use client'
import React from 'react'
import { Check } from 'lucide-react'

interface StepInfo {
  label: string
  icon:  string
}

const STEPS: StepInfo[] = [
  { label: 'Empresa',        icon: '🏢' },
  { label: 'Negócio',        icon: '🎯' },
  { label: 'Serviço',        icon: '✂️' },
  { label: 'Recurso',        icon: '👤' },
  { label: 'Horários',       icon: '🕐' },
  { label: 'Equipa',         icon: '👥' },
  { label: 'Concluir',       icon: '🎉' },
]

interface OnboardingStepperProps {
  currentStep: number  // 1-indexed, 1-7
}

export function OnboardingStepper({ currentStep }: OnboardingStepperProps) {
  return (
    <div className="w-full">
      {/* Mobile: barra de progresso compacta */}
      <div className="sm:hidden px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {STEPS[currentStep - 1]?.icon} {STEPS[currentStep - 1]?.label}
          </span>
          <span className="text-sm text-gray-500">
            {currentStep} / {STEPS.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop: stepper horizontal */}
      <div className="hidden sm:flex items-center justify-center px-6 py-6 gap-0">
        {STEPS.map((step, index) => {
          const stepNumber = index + 1
          const isDone     = stepNumber < currentStep
          const isActive   = stepNumber === currentStep

          return (
            <React.Fragment key={step.label}>
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    isDone
                      ? 'bg-green-500 text-white'
                      : isActive
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isDone ? <Check className="w-5 h-5" /> : step.icon}
                </div>
                <span
                  className={`mt-1 text-xs font-medium whitespace-nowrap ${
                    isActive ? 'text-blue-700' : isDone ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mb-5 transition-colors duration-300 ${
                    stepNumber < currentStep ? 'bg-green-400' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
