import type React from 'react'
import type { Permission } from '@/types/domain/permission'

// Item de navegação — partilhado entre BottomNav, SidebarDesktop e SidebarTablet
export interface NavItem {
  href:        string
  label:       string
  icon:        React.ComponentType<{ className?: string }>
  // Permissão necessária para ver este item; undefined = sempre visível
  permission?: Permission
}
