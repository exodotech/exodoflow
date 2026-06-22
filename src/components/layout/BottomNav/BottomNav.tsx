'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, Users, MessageSquare, Grid2x2 } from 'lucide-react'
import { cn }             from '@/lib/utils/cn'
import { usePermissions } from '@/hooks/usePermissions'
import { useNicheTerms }  from '@/hooks/useNicheTerms'
import { capitalize }     from '@/lib/niche-templates'
import type { NavItem }   from '@/types/ui/nav'

export function BottomNav() {
  const pathname = usePathname()
  const { can }  = usePermissions()
  const terms    = useNicheTerms()

  const allNavItems: NavItem[] = [
    { href: '/dashboard',           label: 'Início',   icon: Home },
    { href: '/dashboard/agenda',    label: 'Agenda',   icon: Calendar,      permission: 'agenda.view_own' },
    { href: '/dashboard/clientes',  label: capitalize(terms.clientPlural), icon: Users, permission: 'clients.view' },
    { href: '/dashboard/conversas', label: 'Chat',     icon: MessageSquare, permission: 'conversas.view' },
    { href: '/dashboard/servicos',  label: 'Mais',     icon: Grid2x2,       permission: 'services.view' },
  ]

  const navItems = allNavItems.filter((item) => !item.permission || can(item.permission))

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-white/30"
      style={{
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(20px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
      }}
    >
      <div className="flex h-16 pb-safe gap-1 px-2">
        {navItems.map((item) => {
          const Icon     = item.icon
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 rounded-xl',
                'h-[52px] transition-all duration-150 text-xs font-semibold',
                isActive ? 'text-white' : 'text-slate-500 hover:text-slate-700 active:scale-95',
              )}
              style={isActive ? {
                background: 'linear-gradient(135deg, var(--tenant-primary), color-mix(in srgb, var(--tenant-primary) 80%, #818cf8))',
                boxShadow: '0 2px 12px color-mix(in srgb, var(--tenant-primary) 35%, transparent)',
              } : undefined}
            >
              <Icon className="w-[18px] h-[18px]" />
              <span className="truncate text-[10px] leading-none">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNav
