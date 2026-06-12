// Labels PT/BR — terminologia que difere entre Portugal e Brasil
import type { SupportedLocale } from './locale'

export interface LocaleLabels {
  // Agenda
  marcacao:       string   // "marcação" (PT) | "agendamento" (BR)
  marcacoes:      string   // "marcações" | "agendamentos"
  criarMarcacao:  string   // "Nova Marcação" | "Novo Agendamento"
  // Contactos
  telemovel:      string   // "telemóvel" (PT) | "celular" (BR)
  // Fiscal
  nif:            string   // "NIF" (PT) | "CPF" (BR)
  nifLabel:       string   // "NIF — Número de Identificação Fiscal" | "CPF — Cadastro de Pessoas Físicas"
  // Moeda
  currency:       string   // "€" | "R$"
  currencyName:   string   // "Euro" | "Real"
  // Endereço
  codigoPostal:   string   // "código postal" (PT) | "CEP" (BR)
  distrito:       string   // "distrito" (PT) | "estado" (BR)
  // Conteúdo
  clinica:        string   // "clínica" | "clínica"
}

const LABELS_PT: LocaleLabels = {
  marcacao:      'marcação',
  marcacoes:     'marcações',
  criarMarcacao: 'Nova Marcação',
  telemovel:     'telemóvel',
  nif:           'NIF',
  nifLabel:      'NIF — Número de Identificação Fiscal',
  currency:      '€',
  currencyName:  'Euro',
  codigoPostal:  'código postal',
  distrito:      'distrito',
  clinica:       'clínica',
}

const LABELS_BR: LocaleLabels = {
  marcacao:      'agendamento',
  marcacoes:     'agendamentos',
  criarMarcacao: 'Novo Agendamento',
  telemovel:     'celular',
  nif:           'CPF',
  nifLabel:      'CPF — Cadastro de Pessoas Físicas',
  currency:      'R$',
  currencyName:  'Real',
  codigoPostal:  'CEP',
  distrito:      'estado',
  clinica:       'clínica',
}

export function getLabels(locale: SupportedLocale): LocaleLabels {
  return locale === 'pt-BR' ? LABELS_BR : LABELS_PT
}
