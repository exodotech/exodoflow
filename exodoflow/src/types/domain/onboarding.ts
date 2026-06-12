import type { TenantNiche, TenantCountry } from './tenant'

// Passo actual do onboarding (0 = não iniciado, 1-6 = em curso, 7 = concluído)
export type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

// Dados do passo 1 — empresa
export interface OnboardingEmpresa {
  name:    string
  slug:    string
  country: TenantCountry
  phone?:  string
  email?:  string
}

// Dados do passo 3 — primeiro serviço
export interface OnboardingServico {
  name:             string
  description?:     string
  duration_minutes: number
  price?:           number
  color:            string
  is_active:        boolean
}

// Horário semanal (um registo por dia)
export interface OnboardingHorario {
  day_of_week: number  // Convenção PostgreSQL DOW: 0=Domingo, 1=Segunda ... 6=Sábado
  start_time:  string  // 'HH:MM'
  end_time:    string  // 'HH:MM'
}

// Dados do passo 4 — primeiro recurso
export interface OnboardingRecurso {
  name:             string
  type:             'staff' | 'room' | 'equipment'
  color:            string
  specialization?:  string
  link_to_profile:  boolean  // true = vincular ao auth.uid() do owner
}

// Dados do passo 5 — disponibilidade
export interface OnboardingDisponibilidade {
  horarios: OnboardingHorario[]
}

// Convite de equipa (passo 6)
export interface OnboardingConvite {
  email:        string
  role:         'manager' | 'receptionist' | 'staff'
  resource_id?: string
}

// Dados do passo 6 — equipa
export interface OnboardingEquipa {
  convites: OnboardingConvite[]
}

// Estado completo do onboarding — agregado para o contexto da UI
export interface OnboardingState {
  step:              OnboardingStep
  completed:         boolean
  empresa?:          OnboardingEmpresa
  niche?:            TenantNiche
  servico?:          OnboardingServico
  recurso?:          OnboardingRecurso
  disponibilidade?:  OnboardingDisponibilidade
  equipa?:           OnboardingEquipa
  // IDs criados durante o onboarding (para referência cruzada entre passos)
  servicoId?:        string
  recursoId?:        string
}

// Resultado da finalização do onboarding
export interface OnboardingFinalizado {
  empresa:    string
  pais:       TenantCountry
  nicho:      TenantNiche
  servico:    string
  recurso:    string
  horarios:   number
}
