'use client'
// Guarda declarativo de permissões — renderiza children ou fallback
// Uso: <PermissionGate permission="services.manage">...</PermissionGate>
import React from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import type { Permission }  from '@/types/domain/permission'

interface PermissionGateProps {
  // Permissão necessária para ver o conteúdo
  permission: Permission
  // O que mostrar se não tiver permissão (padrão: null — invisível)
  fallback?:  React.ReactNode
  children:   React.ReactNode
}

export function PermissionGate({ permission, fallback = null, children }: PermissionGateProps) {
  const { can } = usePermissions()
  return can(permission) ? <>{children}</> : <>{fallback}</>
}

export default PermissionGate
