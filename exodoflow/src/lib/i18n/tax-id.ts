// Helpers de identificação fiscal — NIF (PT) / CPF / CNPJ (BR)
import type { SupportedLocale } from './locale'

export type TaxIdType = 'nif' | 'cpf' | 'cnpj' | 'other'

// Label do campo de acordo com o locale do tenant
export function getTaxIdLabel(locale: SupportedLocale): string {
  return locale === 'pt-BR' ? 'CPF' : 'NIF'
}

export function getTaxIdPlaceholder(locale: SupportedLocale): string {
  return locale === 'pt-BR' ? '000.000.000-00' : '000 000 000'
}

// Detecta o tipo de identificador fiscal a partir do valor e locale
export function detectTaxIdType(value: string, locale: SupportedLocale): TaxIdType {
  const digits = value.replace(/\D/g, '')
  if (locale === 'pt-BR') {
    if (digits.length === 11) return 'cpf'
    if (digits.length === 14) return 'cnpj'
    return 'other'
  }
  // pt-PT → NIF tem 9 dígitos
  if (digits.length === 9) return 'nif'
  return 'other'
}

// Formata o valor para exibição (sem validar a validade fiscal)
export function formatTaxId(value: string, type: TaxIdType): string {
  const d = value.replace(/\D/g, '')
  switch (type) {
    case 'nif':  return d.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')
    case 'cpf':  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    case 'cnpj': return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    default:     return value
  }
}

// Normaliza (remove formatação) — valor limpo para guardar na BD
export function normalizeTaxId(value: string): string {
  return value.replace(/\D/g, '')
}

// Validação básica de formato (não verifica dígitos verificadores)
export function validateTaxIdBasic(value: string, type: TaxIdType): boolean {
  const d = normalizeTaxId(value)
  switch (type) {
    case 'nif':  return d.length === 9
    case 'cpf':  return d.length === 11
    case 'cnpj': return d.length === 14
    default:     return d.length > 0
  }
}
