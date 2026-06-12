'use client'
import React from 'react'
import Link          from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCog,
  Briefcase,
  Zap,
  MessageSquare,
  Settings,
  ShieldCheck,
  Activity,
  LogOut,
} from 'lucide-react'
import { cn }             from '@/lib/utils/cn'
import { forceLogout }    from '@/lib/auth/logout'
import { useAuth }        from '@/providers/AuthProvider'
import { usePermissions } from '@/hooks/usePermissions'
import type { NavItem }   from '@/types/ui/nav'
import type { TenantSettings } from '@/types/domain/tenant'

export function SidebarTablet() {
  const pathname = usePathname()
  const { tenant } = useAuth()
  const { can }  = usePermissions()

  const settings = tenant?.settings as TenantSettings | null | undefined
  const logoUrl  = settings?.branding?.logo_url

  function handleLogout() { void forceLogout() }

  const allNavItems: NavItem[] = [
    { href: '/dashboard',               label: 'Dashboard',    icon: LayoutDashboard },
    { href: '/dashboard/agenda',        label: 'Agenda',       icon: Calendar,        permission: 'agenda.view_own' },
    { href: '/dashboard/clientes',      label: 'Clientes',     icon: Users,           permission: 'clients.view' },
    { href: '/dashboard/servicos',      label: 'Serviços',     icon: Briefcase,       permission: 'services.view' },
    { href: '/dashboard/recursos',      label: 'Recursos',     icon: Zap,             permission: 'resources.view' },
    { href: '/dashboard/conversas',     label: 'Conversas',    icon: MessageSquare,   permission: 'conversas.view' },
    { href: '/dashboard/equipa',        label: 'Equipa',       icon: UserCog,         permission: 'team.view' },
    { href: '/dashboard/auditoria',     label: 'Auditoria',    icon: ShieldCheck,     permission: 'audit.view' },
    { href: '/dashboard/sistema',       label: 'Sistema',      icon: Activity,        permission: 'system.view' },
    { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings,       permission: 'configuracoes.view' },
  ]

  const navItems = allNavItems.filter(
    (item) => !item.permission || can(item.permission)
  )

  return (
    <aside className="hidden md:block lg:hidden fixed left-0 top-0 bottom-0 w-32 bg-gray-900 text-white border-r border-gray-800 overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center justify-center p-3 border-b border-gray-800">
        {logoUrl ? (
          // <img> resiliente (conteúdo de utilizador) — nunca derruba o layout
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={`Logo de ${tenant?.name ?? 'empresa'}`}
            className="h-8 w-auto object-contain"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <h1 className="text-sm font-bold">EF</h1>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 px-2 py-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              style={isActive ? { backgroundColor: 'var(--tenant-primary)' } : undefined}
            className={cn(
                'flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg',
                'transition-colors text-xs font-medium',
                isActive
                  ? 'text-white'
                  : 'text-gray-300 hover:bg-gray-800 active:bg-gray-700'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs text-center break-words line-clamp-2">
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Rodapé: sair */}
      <div className="p-2 border-t border-gray-800 space-y-2">
        <button
          onClick={handleLogout}
          title="Sair"
          className="flex flex-col items-center gap-1 w-full px-3 py-2 rounded-lg text-xs text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
        <p className="text-xs text-gray-600 text-center">v1.0</p>
      </div>
    </aside>
  )
}

export default SidebarTablet
