// Formatação de moeda PT/BR
import type { SupportedLocale } from './locale'

// Mapeamento locale → código ISO 4217
const LOCALE_TO_CURRENCY: Record<SupportedLocale, string> = {
  'pt-PT': 'EUR',
  'pt-BR': 'BRL',
}

export function getCurrencyCode(locale: SupportedLocale): string {
  return LOCALE_TO_CURRENCY[locale]
}

// Formata um valor numérico como moeda de acordo com o locale
export function formatCurrency(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale, {
    style:    'currency',
    currency: LOCALE_TO_CURRENCY[locale],
  }).format(value)
}

// Formata moeda a partir de um código de moeda explícito (quando o tenant guarda currency)
export function formatCurrencyByCode(value: number, currencyCode: string, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale, {
    style:    'currency',
    currency: currencyCode,
  }).format(value)
}
