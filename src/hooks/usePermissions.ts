// Hook de permissões — interface React para o helper canAccess()
// Lê o role do perfil autenticado via useAuth() e expõe helpers reativos
import { useAuth }    from '@/providers/AuthProvider'
import {
  canAccess,
  hasAllPermissions,
  hasAnyPermission,
  isOwner,
  isManager,
  isReceptionist,
  isStaff,
  isManagerOrAbove,
} from '@/lib/permissions'
import type { AppRole, Permission } from '@/types/domain/permission'

export interface UsePermissionsResult {
  // Role actual do utilizador (null = não autenticado ou perfil não carregado)
  role:             AppRole | null
  // Verifica uma permissão específica
  can:              (permission: Permission) => boolean
  // Verifica se tem TODAS as permissões
  canAll:           (...permissions: Permission[]) => boolean
  // Verifica se tem PELO MENOS UMA das permissões
  canAny:           (...permissions: Permission[]) => boolean
  // Helpers semânticos de role
  isOwner:          boolean
  isManager:        boolean
  isReceptionist:   boolean
  isStaff:          boolean
  isManagerOrAbove: boolean
  // false se não há perfil carregado (ainda a carregar ou não autenticado)
  hasRole:          boolean
}

export function usePermissions(): UsePermissionsResult {
  const { profile } = useAuth()
  const role = (profile?.role as AppRole | undefined) ?? null

  return {
    role,
    can:              (permission)     => canAccess(role, permission),
    canAll:           (...permissions) => hasAllPermissions(role, ...permissions),
    canAny:           (...permissions) => hasAnyPermission(role, ...permissions),
    isOwner:          isOwner(role),
    isManager:        isManager(role),
    isReceptionist:   isReceptionist(role),
    isStaff:          isStaff(role),
    isManagerOrAbove: isManagerOrAbove(role),
    hasRole:          role !== null,
  }
}
