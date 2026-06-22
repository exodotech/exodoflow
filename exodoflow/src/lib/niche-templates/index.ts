import type { TenantNiche } from '@/types/domain'

// Templates de nicho pré-configurados.
// Usados para: (1) sugerir serviços e recursos ao criar/onboarding de um tenant,
// (2) adaptar a TERMINOLOGIA da app ao sector (cliente vs paciente vs tutor),
// (3) mostrar ao owner um resumo do seu sector nas Configurações.

export type ResourceType = 'staff' | 'room' | 'equipment'

// Terminologia específica do sector. Permite que a app fale a "língua" do nicho:
// uma clínica dentária vê "Pacientes", uma veterinária vê "Tutores", etc.
export interface NicheTerms {
  clientSingular: string   // "cliente" | "paciente" | "tutor"
  clientPlural:   string   // "clientes" | "pacientes" | "tutores"
  clientNew:      string   // rótulo do botão "Novo cliente" / "Novo paciente"
  professional:   string   // como se chama quem presta o serviço
  // Para nichos em que a marcação envolve um "sujeito" além da pessoa
  // (animal na veterinária, viatura na oficina). undefined quando não se aplica.
  subject?:       string
}

// Recurso de exemplo, já nomeado (para sugerir nomes reais no onboarding).
export interface SampleResource {
  name: string
  type: ResourceType
}

export interface NicheTemplate {
  id:                   TenantNiche
  label:                string
  labelBR?:             string   // label alternativo para o Brasil, se diferente
  description:          string
  tagline:              string   // frase curta de valor para o sector
  color:                string
  emoji:                string
  terms:                NicheTerms
  sample_services: Array<{
    name:             string
    duration_minutes: number
    price:            number
    color:            string
  }>
  sample_resources:      SampleResource[]
  sample_resource_types: ResourceType[]   // mantido por compatibilidade
}

// Terminologia genérica — usada para o nicho 'outro' e como fallback seguro.
export const DEFAULT_NICHE_TERMS: NicheTerms = {
  clientSingular: 'cliente',
  clientPlural:   'clientes',
  clientNew:      'Novo cliente',
  professional:   'profissional',
}

export const NICHE_TEMPLATES: NicheTemplate[] = [
  {
    id:          'estetica',
    label:       'Clínica de Estética',
    description: 'Tratamentos faciais, massagens, unhas e bem-estar.',
    tagline:     'Agenda cheia e clientes fidelizados, sem trabalho manual.',
    color:       '#ec4899',
    emoji:       '💆',
    terms: {
      clientSingular: 'cliente', clientPlural: 'clientes',
      clientNew: 'Novo cliente', professional: 'profissional',
    },
    sample_services: [
      { name: 'Limpeza de Pele',       duration_minutes: 60, price: 45, color: '#6366f1' },
      { name: 'Massagem Relaxante',    duration_minutes: 90, price: 65, color: '#ec4899' },
      { name: 'Manicure',              duration_minutes: 45, price: 25, color: '#14b8a6' },
      { name: 'Pedicure',              duration_minutes: 60, price: 30, color: '#f97316' },
      { name: 'Depilação a Laser',     duration_minutes: 45, price: 55, color: '#8b5cf6' },
    ],
    sample_resources: [
      { name: 'Cabine 1',          type: 'room' },
      { name: 'Sala de massagem',  type: 'room' },
      { name: 'Esteticista',       type: 'staff' },
    ],
    sample_resource_types: ['staff', 'room'],
  },
  {
    id:          'veterinaria',
    label:       'Clínica Veterinária',
    description: 'Consultas, vacinas, cirurgias e banho & tosa.',
    tagline:     'Cuide dos pacientes e mantenha os tutores informados.',
    color:       '#22c55e',
    emoji:       '🐾',
    terms: {
      clientSingular: 'tutor', clientPlural: 'tutores',
      clientNew: 'Novo tutor', professional: 'veterinário(a)', subject: 'animal',
    },
    sample_services: [
      { name: 'Consulta Geral',   duration_minutes: 30, price: 40, color: '#22c55e' },
      { name: 'Vacinação',        duration_minutes: 15, price: 20, color: '#84cc16' },
      { name: 'Banho & Tosa',     duration_minutes: 90, price: 35, color: '#14b8a6' },
      { name: 'Ecografia',        duration_minutes: 30, price: 60, color: '#6366f1' },
      { name: 'Cirurgia',         duration_minutes: 120, price: 150, color: '#ef4444' },
    ],
    sample_resources: [
      { name: 'Consultório 1',     type: 'room' },
      { name: 'Sala de cirurgia',  type: 'room' },
      { name: 'Veterinário(a)',    type: 'staff' },
      { name: 'Aparelho de ecografia', type: 'equipment' },
    ],
    sample_resource_types: ['staff', 'room', 'equipment'],
  },
  {
    id:          'barbearia',
    label:       'Barbearia',
    description: 'Corte, barba, tratamentos capilares e cuidados masculinos.',
    tagline:     'Mais cadeiras cheias, menos faltas, clientes que voltam.',
    color:       '#3b82f6',
    emoji:       '💈',
    terms: {
      clientSingular: 'cliente', clientPlural: 'clientes',
      clientNew: 'Novo cliente', professional: 'barbeiro(a)',
    },
    sample_services: [
      { name: 'Corte de Cabelo',     duration_minutes: 30, price: 15, color: '#3b82f6' },
      { name: 'Barba',               duration_minutes: 20, price: 12, color: '#6366f1' },
      { name: 'Corte + Barba',       duration_minutes: 45, price: 22, color: '#8b5cf6' },
      { name: 'Hidratação Capilar',  duration_minutes: 30, price: 20, color: '#14b8a6' },
      { name: 'Pigmentação',         duration_minutes: 45, price: 25, color: '#f59e0b' },
    ],
    sample_resources: [
      { name: 'Cadeira 1', type: 'staff' },
      { name: 'Cadeira 2', type: 'staff' },
    ],
    sample_resource_types: ['staff'],
  },
  {
    id:          'dentista',
    label:       'Clínica Dentária',
    description: 'Consultas, limpezas, tratamentos e ortodontia.',
    tagline:     'Pacientes acompanhados e cadeiras sempre ocupadas.',
    color:       '#06b6d4',
    emoji:       '🦷',
    terms: {
      clientSingular: 'paciente', clientPlural: 'pacientes',
      clientNew: 'Novo paciente', professional: 'dentista',
    },
    sample_services: [
      { name: 'Consulta de Rotina', duration_minutes: 30,  price: 50,  color: '#06b6d4' },
      { name: 'Limpeza Dentária',   duration_minutes: 45,  price: 60,  color: '#22c55e' },
      { name: 'Extração',           duration_minutes: 30,  price: 80,  color: '#ef4444' },
      { name: 'Branqueamento',      duration_minutes: 60,  price: 150, color: '#f59e0b' },
      { name: 'Aparelho / Ortodontia', duration_minutes: 45, price: 90, color: '#8b5cf6' },
    ],
    sample_resources: [
      { name: 'Gabinete 1',           type: 'room' },
      { name: 'Cadeira odontológica', type: 'equipment' },
      { name: 'Dentista',             type: 'staff' },
    ],
    sample_resource_types: ['staff', 'room', 'equipment'],
  },
  {
    id:          'oficina',
    label:       'Oficina Automóvel',
    labelBR:     'Oficina Mecânica',
    description: 'Revisões, reparações, diagnósticos e serviços gerais.',
    tagline:     'Boxes organizadas e clientes avisados sobre cada viatura.',
    color:       '#6b7280',
    emoji:       '🔧',
    terms: {
      clientSingular: 'cliente', clientPlural: 'clientes',
      clientNew: 'Novo cliente', professional: 'mecânico(a)', subject: 'viatura',
    },
    sample_services: [
      { name: 'Revisão Geral',                     duration_minutes: 120, price: 80, color: '#6b7280' },
      { name: 'Mudança de Óleo',                   duration_minutes: 30,  price: 35, color: '#78716c' },
      { name: 'Diagnóstico Electrónico',            duration_minutes: 60,  price: 50, color: '#3b82f6' },
      { name: 'Alinhamento & Balanceamento',        duration_minutes: 60,  price: 45, color: '#f97316' },
      { name: 'Substituição de Travões',            duration_minutes: 90,  price: 70, color: '#ef4444' },
    ],
    sample_resources: [
      { name: 'Box 1',          type: 'room' },
      { name: 'Elevador',       type: 'equipment' },
      { name: 'Mecânico',       type: 'staff' },
    ],
    sample_resource_types: ['staff', 'room', 'equipment'],
  },
  {
    id:          'fisioterapia',
    label:       'Fisioterapia',
    description: 'Reabilitação, terapia manual, electroterapia e desportiva.',
    tagline:     'Pacientes em recuperação, sessões sempre preenchidas.',
    color:       '#f59e0b',
    emoji:       '🏃',
    terms: {
      clientSingular: 'paciente', clientPlural: 'pacientes',
      clientNew: 'Novo paciente', professional: 'fisioterapeuta',
    },
    sample_services: [
      { name: 'Avaliação Inicial',        duration_minutes: 60, price: 60, color: '#f59e0b' },
      { name: 'Sessão de Fisioterapia',   duration_minutes: 45, price: 45, color: '#22c55e' },
      { name: 'Massagem Terapêutica',     duration_minutes: 45, price: 40, color: '#ec4899' },
      { name: 'Electroterapia',           duration_minutes: 30, price: 35, color: '#6366f1' },
      { name: 'Reabilitação Desportiva',  duration_minutes: 60, price: 50, color: '#3b82f6' },
    ],
    sample_resources: [
      { name: 'Sala de terapia',            type: 'room' },
      { name: 'Fisioterapeuta',             type: 'staff' },
      { name: 'Equipamento de eletroterapia', type: 'equipment' },
    ],
    sample_resource_types: ['staff', 'room', 'equipment'],
  },
]

// Dicionário para acesso rápido por ID
export const NICHE_TEMPLATE_MAP: Record<TenantNiche, NicheTemplate | undefined> = {
  estetica:     NICHE_TEMPLATES[0],
  veterinaria:  NICHE_TEMPLATES[1],
  barbearia:    NICHE_TEMPLATES[2],
  dentista:     NICHE_TEMPLATES[3],
  oficina:      NICHE_TEMPLATES[4],
  fisioterapia: NICHE_TEMPLATES[5],
  outro:        undefined,
}

// Terminologia do nicho, com fallback genérico para 'outro'/desconhecido.
export function getNicheTerms(niche?: TenantNiche | null): NicheTerms {
  if (!niche) return DEFAULT_NICHE_TERMS
  return NICHE_TEMPLATE_MAP[niche]?.terms ?? DEFAULT_NICHE_TERMS
}

// "cliente" → "Cliente" (primeira maiúscula), respeitando acentos.
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
