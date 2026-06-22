// Helpers de identificação fiscal — NIF (PT) / CPF / CNPJ (BR)
// Regra: PT mostra SÓ NIF; BR mostra CPF (Pessoa Física) ou CNPJ (Pessoa Jurídica).
// Nunca mostrar CPF/CNPJ a Portugal nem NIF ao Brasil.
import type { SupportedLocale } from './locale'

export type TaxIdType = 'nif' | 'cpf' | 'cnpj' | 'other'

// Opção de tipo fiscal apresentável (BR escolhe entre PF e PJ).
export interface TaxIdOption {
  type:  TaxIdType
  label: string   // ex: "CPF (Pessoa Física)"
  short: string   // ex: "CPF"
}

// Tipos fiscais válidos por país. PT → só NIF; BR → CPF (PF) ou CNPJ (PJ).
export function getTaxIdOptions(locale: SupportedLocale): TaxIdOption[] {
  if (locale === 'pt-BR') {
    return [
      { type: 'cpf',  label: 'CPF (Pessoa Física)',    short: 'CPF' },
      { type: 'cnpj', label: 'CNPJ (Pessoa Jurídica)', short: 'CNPJ' },
    ]
  }
  return [{ type: 'nif', label: 'NIF (Número de Identificação Fiscal)', short: 'NIF' }]
}

// Tipo fiscal por omissão do país (PT → nif, BR → cpf). Nunca 'other'/'cnpj'.
export function defaultTaxIdType(locale: SupportedLocale): 'nif' | 'cpf' {
  return locale === 'pt-BR' ? 'cpf' : 'nif'
}

// Garante que um tipo pertence ao país (PT nunca cpf/cnpj; BR nunca nif).
export function isTaxIdTypeForCountry(type: TaxIdType, locale: SupportedLocale): boolean {
  return getTaxIdOptions(locale).some((o) => o.type === type)
}

// Label curta do campo conforme país + tipo. type omitido usa o tipo por omissão.
export function getTaxIdLabel(locale: SupportedLocale, type?: TaxIdType): string {
  if (locale === 'pt-BR') return type === 'cnpj' ? 'CNPJ' : 'CPF'
  return 'NIF'
}

// Placeholder conforme o TIPO fiscal escolhido.
export function getTaxIdPlaceholder(type: TaxIdType): string {
  switch (type) {
    case 'cpf':  return '000.000.000-00'
    case 'cnpj': return '00.000.000/0000-00'
    case 'nif':  return '000 000 000'
    default:     return ''
  }
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
