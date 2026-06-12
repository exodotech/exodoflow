import type { TenantNiche } from '@/types/domain'

// Templates de nicho pré-configurados
// Usados para sugerir serviços e recursos ao criar um novo tenant
export interface NicheTemplate {
  id:                   TenantNiche
  label:                string
  labelBR?:             string   // label alternativo para o Brasil, se diferente
  description:          string
  color:                string
  emoji:                string
  sample_services: Array<{
    name:             string
    duration_minutes: number
    price:            number
    color:            string
  }>
  sample_resource_types: Array<'staff' | 'room' | 'equipment'>
}

export const NICHE_TEMPLATES: NicheTemplate[] = [
  {
    id:          'estetica',
    label:       'Clínica de Estética',
    description: 'Tratamentos faciais, massagens, unhas e bem-estar.',
    color:       '#ec4899',
    emoji:       '💆',
    sample_services: [
      { name: 'Limpeza de Pele',       duration_minutes: 60, price: 45, color: '#6366f1' },
      { name: 'Massagem Relaxante',    duration_minutes: 90, price: 65, color: '#ec4899' },
      { name: 'Manicure',              duration_minutes: 45, price: 25, color: '#14b8a6' },
      { name: 'Pedicure',              duration_minutes: 60, price: 30, color: '#f97316' },
    ],
    sample_resource_types: ['staff', 'room'],
  },
  {
    id:          'veterinaria',
    label:       'Clínica Veterinária',
    description: 'Consultas, vacinas, cirurgias e banho & tosa.',
    color:       '#22c55e',
    emoji:       '🐾',
    sample_services: [
      { name: 'Consulta Geral',   duration_minutes: 30, price: 40, color: '#22c55e' },
      { name: 'Vacinação',        duration_minutes: 15, price: 20, color: '#84cc16' },
      { name: 'Banho & Tosa',     duration_minutes: 90, price: 35, color: '#14b8a6' },
      { name: 'Ecografia',        duration_minutes: 30, price: 60, color: '#6366f1' },
    ],
    sample_resource_types: ['staff', 'room', 'equipment'],
  },
  {
    id:          'barbearia',
    label:       'Barbearia',
    description: 'Corte, barba, tratamentos capilares e cuidados masculinos.',
    color:       '#3b82f6',
    emoji:       '💈',
    sample_services: [
      { name: 'Corte de Cabelo',     duration_minutes: 30, price: 15, color: '#3b82f6' },
      { name: 'Barba',               duration_minutes: 20, price: 12, color: '#6366f1' },
      { name: 'Corte + Barba',       duration_minutes: 45, price: 22, color: '#8b5cf6' },
      { name: 'Hidratação Capilar',  duration_minutes: 30, price: 20, color: '#14b8a6' },
    ],
    sample_resource_types: ['staff'],
  },
  {
    id:          'dentista',
    label:       'Clínica Dentária',
    description: 'Consultas, limpezas, tratamentos e ortodontia.',
    color:       '#06b6d4',
    emoji:       '🦷',
    sample_services: [
      { name: 'Consulta de Rotina', duration_minutes: 30,  price: 50,  color: '#06b6d4' },
      { name: 'Limpeza Dentária',   duration_minutes: 45,  price: 60,  color: '#22c55e' },
      { name: 'Extração',           duration_minutes: 30,  price: 80,  color: '#ef4444' },
      { name: 'Branqueamento',      duration_minutes: 60,  price: 150, color: '#f59e0b' },
    ],
    sample_resource_types: ['staff', 'room', 'equipment'],
  },
  {
    id:          'oficina',
    label:       'Oficina Automóvel',
    labelBR:     'Oficina Mecânica',
    description: 'Revisões, reparações, diagnósticos e serviços gerais.',
    color:       '#6b7280',
    emoji:       '🔧',
    sample_services: [
      { name: 'Revisão Geral',                     duration_minutes: 120, price: 80, color: '#6b7280' },
      { name: 'Mudança de Óleo',                   duration_minutes: 30,  price: 35, color: '#78716c' },
      { name: 'Diagnóstico Electrónico',            duration_minutes: 60,  price: 50, color: '#3b82f6' },
      { name: 'Alinhamento & Balanceamento',        duration_minutes: 60,  price: 45, color: '#f97316' },
    ],
    sample_resource_types: ['staff', 'room'],
  },
  {
    id:          'fisioterapia',
    label:       'Fisioterapia',
    description: 'Reabilitação, terapia manual, electroterapia e desportiva.',
    color:       '#f59e0b',
    emoji:       '🏃',
    sample_services: [
      { name: 'Avaliação Inicial',        duration_minutes: 60, price: 60, color: '#f59e0b' },
      { name: 'Sessão de Fisioterapia',   duration_minutes: 45, price: 45, color: '#22c55e' },
      { name: 'Massagem Terapêutica',     duration_minutes: 45, price: 40, color: '#ec4899' },
      { name: 'Electroterapia',           duration_minutes: 30, price: 35, color: '#6366f1' },
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
