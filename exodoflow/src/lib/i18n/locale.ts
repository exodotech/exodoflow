// Helpers de locale — PT/BR
import type { SupportedLocale } from '@/types/domain/communication'

export type { SupportedLocale }

// Locale padrão quando não há configuração de tenant
export const DEFAULT_LOCALE: SupportedLocale = 'pt-PT'

// Mapeia código de país para locale
const COUNTRY_TO_LOCALE: Record<string, SupportedLocale> = {
  PT: 'pt-PT',
  BR: 'pt-BR',
}

export function countryToLocale(countryCode: string): SupportedLocale {
  return COUNTRY_TO_LOCALE[countryCode.toUpperCase()] ?? DEFAULT_LOCALE
}

// Devolve true se o locale é Brasil
export function isBrazil(locale: SupportedLocale): boolean {
  return locale === 'pt-BR'
}

// Devolve true se o locale é Portugal
export function isPortugal(locale: SupportedLocale): boolean {
  return locale === 'pt-PT'
}
