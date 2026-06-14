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

    // Recarrega perfil + tenant. Executado FORA do callback de auth (ver abaixo).
    async function recarregarPerfilTenant(userId: string) {
      setIsLoading(true)
      try {
        const { data: profileData } = await supabase
          .from('profiles').select('*').eq('id', userId).single()
        if (profileData) {
          setProfile(profileData as Profile)
          if (profileData.tenant_id) {
            const { data: tenantData } = await supabase
              .from('tenants').select('*').eq('id', profileData.tenant_id).single()
            setTenant(tenantData as Tenant | null)
          }
        }
      } finally {
        setIsLoading(false)
      }
    }

    // Actualizar estado quando a sessão muda (login/logout noutro separador, token expirado).
    // IMPORTANTE: o supabase-js segura um lock (navigator.locks) DURANTE este callback;
    // chamar outra função Supabase aqui dentro causa DEADLOCK (queries ficam penduradas).
    // Por isso as queries são diferidas com setTimeout(0) — liberta o lock primeiro.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null)
        setProfile(null)
        setTenant(null)
        return
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session.user)
        const userId = session.user.id
        setTimeout(() => { void recarregarPerfilTenant(userId) }, 0)
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
