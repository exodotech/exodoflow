// Formatação de datas com timezone — PT/BR
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { SupportedLocale } from './locale'

// Locale date-fns por SupportedLocale
// pt-PT usa o locale padrão do date-fns (sem import separado necessário)
function getDateFnsLocale(locale: SupportedLocale) {
  return locale === 'pt-BR' ? ptBR : undefined
}

// Formata uma data ISO num formato legível (ex: "09 jun. 2026")
export function formatDate(isoDate: string, locale: SupportedLocale): string {
  return format(parseISO(isoDate), 'dd MMM yyyy', { locale: getDateFnsLocale(locale) })
}

// Formata data e hora (ex: "09 jun. 2026, 14:30")
export function formatDateTime(isoDate: string, locale: SupportedLocale): string {
  return format(parseISO(isoDate), "dd MMM yyyy, HH:mm", { locale: getDateFnsLocale(locale) })
}

// Formata apenas a hora (ex: "14:30")
export function formatTime(isoDate: string): string {
  return format(parseISO(isoDate), 'HH:mm')
}

// Formata data no formato DD/MM/YYYY (útil para campos de formulário)
export function formatDateShort(isoDate: string): string {
  return format(parseISO(isoDate), 'dd/MM/yyyy')
}

// Converte uma data ISO UTC para uma string legível num timezone específico
// Usa Intl.DateTimeFormat que suporta qualquer timezone IANA
export function formatDateInTimezone(
  isoDate: string,
  timezone: string,
  locale: SupportedLocale
): string {
  const date = new Date(isoDate)
  return new Intl.DateTimeFormat(locale, {
    timeZone:    timezone,
    day:         '2-digit',
    month:       'short',
    year:        'numeric',
    hour:        '2-digit',
    minute:      '2-digit',
    hour12:      false,
  }).format(date)
}

// Devolve apenas a hora num timezone específico
export function formatTimeInTimezone(isoDate: string, timezone: string): string {
  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: timezone,
    hour:     '2-digit',
    minute:   '2-digit',
    hour12:   false,
  }).format(new Date(isoDate))
}
