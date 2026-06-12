'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, Users, MessageSquare, Grid2x2 } from 'lucide-react'
import { cn }             from '@/lib/utils/cn'
import { usePermissions } from '@/hooks/usePermissions'
import type { NavItem }   from '@/types/ui/nav'

export function BottomNav() {
  const pathname = usePathname()
  const { can }  = usePermissions()

  const allNavItems: NavItem[] = [
    { href: '/dashboard',           label: 'Início',   icon: Home },
    { href: '/dashboard/agenda',    label: 'Agenda',   icon: Calendar,      permission: 'agenda.view_own' },
    { href: '/dashboard/clientes',  label: 'Clientes', icon: Users,         permission: 'clients.view' },
    { href: '/dashboard/conversas', label: 'Chat',     icon: MessageSquare, permission: 'conversas.view' },
    { href: '/dashboard/servicos',  label: 'Mais',     icon: Grid2x2,       permission: 'services.view' },
  ]

  // Filtrar items visíveis para este role
  const navItems = allNavItems.filter(
    (item) => !item.permission || can(item.permission)
  )

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden">
      <div className="flex h-16 pb-safe gap-1 px-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))

          return (
            <Link
              key={item.href}
              href={item.href}
              style={isActive ? { color: 'var(--tenant-primary)', backgroundColor: 'color-mix(in srgb, var(--tenant-primary) 10%, transparent)' } : undefined}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 rounded-lg',
                'h-14 transition-colors text-xs font-medium',
                isActive
                  ? ''
                  : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNav
