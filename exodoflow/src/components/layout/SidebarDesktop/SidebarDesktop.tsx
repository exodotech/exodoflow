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

const ROLE_LABELS: Record<string, string> = {
  owner:       'Proprietário',
  manager:     'Gestor',
  receptionist: 'Recepcionista',
  staff:       'Colaborador',
}

export function SidebarDesktop() {
  const pathname  = usePathname()
  const { tenant, profile } = useAuth()
  const { can }   = usePermissions()

  const settings  = tenant?.settings as TenantSettings | null | undefined
  const logoUrl   = settings?.branding?.logo_url

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

  // Filtrar items que o utilizador pode ver
  const navItems = allNavItems.filter(
    (item) => !item.permission || can(item.permission)
  )

  function handleLogout() { void forceLogout() }

  return (
    <aside className="hidden xl:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-gray-900 text-white border-r border-gray-800 overflow-y-auto">
      {/* Logo + nome do tenant */}
      <div className="p-6 border-b border-gray-800">
        {logoUrl ? (
          // Logo do tenant (conteúdo de utilizador). <img> em vez de next/image:
          // resiliente — uma URL inválida apenas se esconde, nunca derruba o dashboard.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={`Logo de ${tenant?.name ?? 'empresa'}`}
            className="h-10 w-auto object-contain mb-2"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <h1 className="text-xl font-bold">ExodoFlow</h1>
        )}
        <p className="text-xs text-gray-400 mt-1 truncate">
          {tenant?.name ?? 'A carregar...'}
        </p>
      </div>

      {/* Menu de navegação */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map((item) => {
          const Icon     = item.icon
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))

          return (
            <Link
              key={item.href}
              href={item.href}
              style={isActive ? { backgroundColor: 'var(--tenant-primary)' } : undefined}
            className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg',
                'transition-colors text-sm font-medium',
                isActive
                  ? 'text-white'
                  : 'text-gray-300 hover:bg-gray-800 active:bg-gray-700'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Rodapé: role + versão + botão sair */}
      <div className="p-4 border-t border-gray-800 space-y-3">
        {profile?.role && (
          // Liga à página de conta própria (editar dados + palavra-passe)
          <Link
            href="/dashboard/perfil"
            className="block px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <p className="text-xs font-medium text-gray-300 truncate">
              {profile.full_name ?? 'Utilizador'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {ROLE_LABELS[profile.role] ?? profile.role} · A minha conta
            </p>
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </button>
        <p className="text-xs text-gray-600 px-1">v1.0.0</p>
      </div>
    </aside>
  )
}

export default SidebarDesktop
