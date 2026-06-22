// Derivação de mercado: país → fuso horário, moeda e locale.
// Fonte ÚNICA desta derivação (evita mapas duplicados no criar-empresa e na
// troca de país pelo superadmin). País é definido na criação; só o superadmin
// o altera (migração 0018 lock_tenant_market permite-o).
import { countryToLocale } from './locale'
import type { SupportedLocale } from './locale'

export type MarketCountry = 'PT' | 'BR'

export interface MarketSettings {
  timezone: string
  currency: string
  locale:   SupportedLocale
}

const TIMEZONE: Record<MarketCountry, string> = { PT: 'Europe/Lisbon', BR: 'America/Sao_Paulo' }
const CURRENCY: Record<MarketCountry, string> = { PT: 'EUR',           BR: 'BRL' }

export const MARKET_LABEL: Record<MarketCountry, string> = { PT: '🇵🇹 Portugal', BR: '🇧🇷 Brasil' }

// Normaliza qualquer código para um país suportado (omissão: PT).
export function toMarketCountry(country: string): MarketCountry {
  return (country ?? '').toUpperCase() === 'BR' ? 'BR' : 'PT'
}

// Deriva fuso/moeda/locale a partir do país.
export function deriveMarketSettings(country: string): MarketSettings {
  const c = toMarketCountry(country)
  return { timezone: TIMEZONE[c], currency: CURRENCY[c], locale: countryToLocale(c) }
}
