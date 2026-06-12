'use client'
// Fornece o contexto de autenticação e tenant a toda a área privada (/dashboard)
// Recebe os dados iniciais do Server Component e regista onAuthStateChange
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/domain/profile'
import type { Tenant }  from '@/types/domain/tenant'

// Valor exposto pelo contexto
export interface AuthContextValue {
  user:      User | null
  profile:   Profile | null
  tenant:    Tenant | null
  isLoading: boolean
  // Relê o tenant da BD e actualiza o contexto. Necessário após mutações que
  // alteram tenants.settings (ex: branding) — o tenant vive em estado React,
  // não numa query TanStack, por isso invalidar queries não o actualiza.
  refreshTenant: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user:      null,
  profile:   null,
  tenant:    null,
  isLoading: false,
  refreshTenant: async () => {},
})

// Hook para consumir o contexto em qualquer Client Component da área privada
export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}

interface AuthProviderProps {
  children:       ReactNode
  initialUser:    User | null
  initialProfile: Profile | null
  initialTenant:  Tenant | null
}

export function AuthProvider({
  children,
  initialUser,
  initialProfile,
  initialTenant,
}: AuthProviderProps) {
  const [user,      setUser]      = useState<User | null>(initialUser)
  const [profile,   setProfile]   = useState<Profile | null>(initialProfile)
  const [tenant,    setTenant]    = useState<Tenant | null>(initialTenant)
  const [isLoading, setIsLoading] = useState(false)

  // Relê o tenant da BD — chamado após guardar branding/configurações
  // para que a UI (BrandingProvider, configurações) reflicta logo a alteração
  const refreshTenant = useCallback(async () => {
    const tenantId = profile?.tenant_id
    if (!tenantId) return
    const supabase = createClient()
    const { data } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single()
    if (data) setTenant(data as Tenant)
  }, [profile?.tenant_id])

  useEffect(() => {
    const supabase = createClient()

    // Actualizar estado quando a sessão muda (login/logout noutro separador, token expirado)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null)
        setProfile(null)
        setTenant(null)
        return
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setIsLoading(true)
        setUser(session.user)

        // Recarregar perfil e tenant após login (ex: se usou OAuth)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileData) {
          setProfile(profileData as Profile)

          if (profileData.tenant_id) {
            const { data: tenantData } = await supabase
              .from('tenants')
              .select('*')
              .eq('id', profileData.tenant_id)
              .single()
            setTenant(tenantData as Tenant | null)
          }
        }

        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, tenant, isLoading, refreshTenant }}>
      {children}
    </AuthContext.Provider>
  )
}
