import type { Database } from '@/types/database'

// Dados do cliente conforme schema da base de dados
export type Client = Database['public']['Tables']['clients']['Row']
export type ClientInsert = Database['public']['Tables']['clients']['Insert']
export type ClientUpdate = Database['public']['Tables']['clients']['Update']

// Registo de consentimento legal (RGPD/LGPD) — imutável após criação
export type LegalConsent = Database['public']['Tables']['legal_consents']['Row']

// Cliente com histórico de consentimentos carregado
export type ClientWithConsents = Client & {
  legal_consents?: LegalConsent[]
}
