// Helper de controlo de acesso — lógica pura (sem React)
// Importado pelo hook usePermissions() e por qualquer código server-side
import { ROLE_PERMISSIONS } from '@/types/domain/permission'
import type { AppRole, Permission } from '@/types/domain/permission'

export type { AppRole, Permission }

// Verifica se um role tem uma permissão específica
// role=null representa utilizador sem role válida → sempre false
export function canAccess(role: AppRole | null | undefined, permission: Permission): boolean {
  if (!role) return false
  return (ROLE_PERMISSIONS[role] as ReadonlyArray<Permission>).includes(permission)
}

// Verifica se o role tem TODAS as permissões indicadas
export function hasAllPermissions(
  role: AppRole | null | undefined,
  ...permissions: Permission[]
): boolean {
  return permissions.every((p) => canAccess(role, p))
}

// Verifica se o role tem PELO MENOS UMA das permissões indicadas
export function hasAnyPermission(
  role: AppRole | null | undefined,
  ...permissions: Permission[]
): boolean {
  return permissions.some((p) => canAccess(role, p))
}

// Helpers de role semânticos — evitam comparações de string espalhadas pelo código
export const isOwner       = (role: AppRole | null | undefined): boolean => role === 'owner'
export const isManager     = (role: AppRole | null | undefined): boolean => role === 'manager'
export const isReceptionist = (role: AppRole | null | undefined): boolean => role === 'receptionist'
export const isStaff       = (role: AppRole | null | undefined): boolean => role === 'staff'

// OWNER e MANAGER têm acesso de gestão (equivalem ao antigo 'admin')
export const isManagerOrAbove = (role: AppRole | null | undefined): boolean =>
  role === 'owner' || role === 'manager'

// Utilizado no menu de navegação para mostrar/ocultar itens
export const NAV_PERMISSIONS = {
  agenda:        'agenda.view'        as Permission,
  clientes:      'clients.view'       as Permission,
  servicos:      'services.view'      as Permission,
  recursos:      'resources.view'     as Permission,
  conversas:     'conversas.view'     as Permission,
  configuracoes: 'configuracoes.view' as Permission,
} as const
