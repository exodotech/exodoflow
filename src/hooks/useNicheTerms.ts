'use client'
// Terminologia do nicho do tenant atual (cliente/paciente/tutor…), pronta a usar
// em qualquer Client Component da área privada. Lê o business_type do tenant
// (AuthProvider) e devolve os termos, com fallback genérico seguro.
import { useAuth } from '@/providers/AuthProvider'
import { getNicheTerms, type NicheTerms } from '@/lib/niche-templates'

export function useNicheTerms(): NicheTerms {
  const { tenant } = useAuth()
  return getNicheTerms(tenant?.business_type)
}
