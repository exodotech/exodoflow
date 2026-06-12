import type { Database } from '@/types/database'
import type { SupportedLocale } from '@/types/domain/communication'

// Nicho de negócio — alinhado com o CHECK constraint da BD (0002_tables.sql)
export type TenantNiche =
  | 'estetica'
  | 'veterinaria'
  | 'barbearia'
  | 'dentista'
  | 'oficina'
  | 'fisioterapia'
  | 'outro'

// País suportado no onboarding
export type TenantCountry = 'PT' | 'BR'

// Modo de tema visual
export type ThemeMode = 'light' | 'dark' | 'system'

// Estado operacional do tenant
export type TenantStatus = 'active' | 'inactive' | 'trial' | 'suspended'

// Configurações de branding do tenant (simplificado: logo + cor primária)
export interface BrandingSettings {
  primary_color:    string          // Obrigatório — hex (#rrggbb)
  logo_url?:        string          // URL pública do logo (Storage ou externo)
  theme_mode:       ThemeMode       // Tema visual (fixo em 'light' nesta fase)
}

// Configurações operacionais (armazenadas no campo settings JSONB)
export interface TenantSettings {
  timezone:               string
  currency:               string
  locale?:                SupportedLocale
  slot_interval_minutes:  number
  booking_advance_days?:  number
  cancellation_hours?:    number
  branding?:              BrandingSettings
}

// Cor primária por defeito (azul profissional)
export const DEFAULT_PRIMARY_COLOR   = '#2563eb'
export const DEFAULT_THEME_MODE: ThemeMode = 'light'

// Presets de cor principais para o seletor
export interface BrandingColorPreset {
  label: string
  color: string
  bg:    string  // classe Tailwind para preview
}

export const COLOR_PRESETS: BrandingColorPreset[] = [
  { label: 'Azul Profissional', color: '#2563eb', bg: 'bg-blue-600' },
  { label: 'Rose Gold',         color: '#e11d48', bg: 'bg-rose-600' },
  { label: 'Verde Saúde',       color: '#16a34a', bg: 'bg-green-600' },
  { label: 'Roxo Premium',      color: '#7c3aed', bg: 'bg-violet-600' },
  { label: 'Preto/Dourado',     color: '#1c1917', bg: 'bg-stone-900' },
  { label: 'Laranja Oficina',   color: '#ea580c', bg: 'bg-orange-600' },
]

type _Row = Database['public']['Tables']['tenants']['Row']

// Tenant com business_type e country tipados (não string genérico)
export type Tenant = Omit<_Row, 'business_type' | 'country'> & {
  business_type: TenantNiche
  country:       TenantCountry
}

type _InsertRow = Database['public']['Tables']['tenants']['Insert']
export type TenantInsert = Omit<_InsertRow, 'business_type' | 'country'> & {
  business_type: TenantNiche
  country?:      TenantCountry
}

type _UpdateRow = Database['public']['Tables']['tenants']['Update']
export type TenantUpdate = Omit<_UpdateRow, 'business_type' | 'country'> & {
  business_type?: TenantNiche
  country?:       TenantCountry
}
