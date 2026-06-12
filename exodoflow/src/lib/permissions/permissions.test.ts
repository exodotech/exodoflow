import { describe, it, expect } from 'vitest'
import {
  canAccess, hasAllPermissions, hasAnyPermission,
  isOwner, isManagerOrAbove, isStaff,
} from './index'

describe('canAccess — RBAC por role', () => {
  it('owner tem acesso total (billing, equipa, configurações)', () => {
    expect(canAccess('owner', 'billing.edit')).toBe(true)
    expect(canAccess('owner', 'team.manage')).toBe(true)
    expect(canAccess('owner', 'configuracoes.edit')).toBe(true)
  })

  it('manager NÃO gere equipa nem billing (mas vê a equipa)', () => {
    expect(canAccess('manager', 'team.manage')).toBe(false)
    expect(canAccess('manager', 'billing.edit')).toBe(false)
    expect(canAccess('manager', 'team.view')).toBe(true)
  })

  it('receptionist limita-se a agenda/clientes/conversas', () => {
    expect(canAccess('receptionist', 'agenda.view')).toBe(true)
    expect(canAccess('receptionist', 'clients.view')).toBe(true)
    expect(canAccess('receptionist', 'services.manage')).toBe(false)
    expect(canAccess('receptionist', 'team.view')).toBe(false)
  })

  it('staff só vê a própria agenda — sem gestão', () => {
    expect(canAccess('staff', 'agenda.view_own')).toBe(true)
    expect(canAccess('staff', 'agenda.view')).toBe(false)
    expect(canAccess('staff', 'clients.create')).toBe(false)
  })

  it('superadmin NÃO tem permissões operacionais de tenant', () => {
    expect(canAccess('superadmin', 'clients.view')).toBe(false)
    expect(canAccess('superadmin', 'configuracoes.view')).toBe(false)
  })

  it('role nula/indefinida nunca tem acesso', () => {
    expect(canAccess(null, 'agenda.view')).toBe(false)
    expect(canAccess(undefined, 'agenda.view')).toBe(false)
  })
})

describe('hasAll / hasAny', () => {
  it('hasAllPermissions exige todas', () => {
    expect(hasAllPermissions('owner', 'clients.view', 'clients.create')).toBe(true)
    expect(hasAllPermissions('staff', 'agenda.view_own', 'clients.create')).toBe(false)
  })
  it('hasAnyPermission basta uma', () => {
    expect(hasAnyPermission('staff', 'billing.edit', 'agenda.view_own')).toBe(true)
    expect(hasAnyPermission('staff', 'billing.edit', 'team.manage')).toBe(false)
  })
})

describe('helpers semânticos de role', () => {
  it('isOwner / isManagerOrAbove / isStaff', () => {
    expect(isOwner('owner')).toBe(true)
    expect(isManagerOrAbove('manager')).toBe(true)
    expect(isManagerOrAbove('receptionist')).toBe(false)
    expect(isStaff('staff')).toBe(true)
  })
})
