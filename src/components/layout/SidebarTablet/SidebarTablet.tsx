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
  Wallet,
  BarChart2,
  TrendingUp,
  Settings,
  ShieldCheck,
  Activity,
  LogOut,
} from 'lucide-react'
import { cn }             from '@/lib/utils/cn'
import { forceLogout }    from '@/lib/auth/logout'
import { useAuth }        from '@/providers/AuthProvider'
import { usePermissions } from '@/hooks/usePermissions'
import { useNicheTerms }  from '@/hooks/useNicheTerms'
import { capitalize }     from '@/lib/niche-templates'
import { LogoMark }       from '@/components/brand/Logo'
import { ThemeToggle }    from '@/components/brand/ThemeToggle'
import type { NavItem }   from '@/types/ui/nav'
import type { TenantSettings } from '@/types/domain/tenant'

export function SidebarTablet() {
  const pathname = usePathname()
  const { tenant } = useAuth()
  const { can }  = usePermissions()
  const terms    = useNicheTerms()

  const settings = tenant?.settings as TenantSettings | null | undefined
  const logoUrl  = settings?.branding?.logo_url

  function handleLogout() { void forceLogout() }

  const allNavItems: NavItem[] = [
    { href: '/dashboard',               label: 'Dashboard',    icon: LayoutDashboard },
    { href: '/dashboard/agenda',        label: 'Agenda',       icon: Calendar,        permission: 'agenda.view_own' },
    { href: '/dashboard/clientes',      label: capitalize(terms.clientPlural), icon: Users, permission: 'clients.view' },
    { href: '/dashboard/servicos',      label: 'Serviços',     icon: Briefcase,       permission: 'services.view' },
    { href: '/dashboard/recursos',      label: 'Recursos',     icon: Zap,             permission: 'resources.view' },
    { href: '/dashboard/conversas',     label: 'Conversas',    icon: MessageSquare,   permission: 'conversas.view' },
    { href: '/dashboard/financas',      label: 'Finanças',     icon: Wallet,          permission: 'financas.view' },
    { href: '/dashboard/analytics',     label: 'Analytics',    icon: TrendingUp,      permission: 'relatorios.view' },
    { href: '/dashboard/relatorios',    label: 'Relatórios',   icon: BarChart2,       permission: 'relatorios.view' },
    { href: '/dashboard/equipa',        label: 'Equipa',       icon: UserCog,         permission: 'team.view' },
    { href: '/dashboard/auditoria',     label: 'Auditoria',    icon: ShieldCheck,     permission: 'audit.view' },
    { href: '/dashboard/sistema',       label: 'Sistema',      icon: Activity,        permission: 'system.view' },
    { href: '/dashboard/configuracoes', label: 'Config.',      icon: Settings,        permission: 'configuracoes.view' },
  ]

  const navItems = allNavItems.filter((item) => !item.permission || can(item.permission))

  return (
    <aside className={cn(
      'hidden md:flex lg:hidden flex-col fixed left-0 top-0 bottom-0 w-[72px] overflow-y-auto z-40',
      'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950',
      'border-r border-white/[0.06]',
    )}>
      {/* Brilho decorativo topo */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 right-0 h-32 opacity-20"
        style={{ background: 'radial-gradient(ellipse 100% 60% at 50% 0%, var(--tenant-primary), transparent)' }}
      />

      {/* MARCA DO PRODUTO — sempre visível */}
      <div className="relative flex items-center justify-center py-4 border-b border-white/[0.07]" title="ExodoFlow Pro">
        <LogoMark className="h-7 w-auto" />
      </div>

      {/* EMPRESA ATUAL — avatar do tenant (logo opcional ou inicial) */}
      <div className="relative flex items-center justify-center py-2.5 border-b border-white/[0.07]" title={tenant?.name ?? 'Empresa'}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={`Logo de ${tenant?.name ?? 'empresa'}`}
            className="h-7 w-7 rounded-lg object-contain bg-white/90 p-0.5"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <span
            className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'color-mix(in srgb, var(--tenant-primary) 80%, #334155)' }}
          >
            {(tenant?.name ?? 'E').charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Navegação — apenas ícones com tooltip */}
      <nav className="relative flex-1 px-2 py-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon     = item.icon
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                'flex items-center justify-center w-full h-10 rounded-xl',
                'transition-all duration-150',
                isActive
                  ? 'text-white shadow-[0_2px_12px_rgba(0,0,0,0.3)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] active:bg-white/[0.14]'
              )}
              style={isActive ? {
                background: 'linear-gradient(135deg, var(--tenant-primary), color-mix(in srgb, var(--tenant-primary) 80%, #818cf8))',
              } : undefined}
            >
              <Icon className="w-[18px] h-[18px]" />
            </Link>
          )
        })}
      </nav>

      {/* Tema + Logout */}
      <div className="relative px-2 py-3 border-t border-white/[0.07] flex flex-col items-center gap-1">
        <ThemeToggle className="w-10 h-10 text-slate-400 hover:text-slate-200 hover:bg-white/[0.08]" />
        <button
          onClick={handleLogout}
          title="Sair"
          className="flex items-center justify-center w-full h-10 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/[0.08] transition-all duration-150"
        >
          <LogOut className="w-[18px] h-[18px]" />
        </button>
      </div>
    </aside>
  )
}

export default SidebarTablet
