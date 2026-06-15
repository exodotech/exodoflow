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
  Settings,
  ShieldCheck,
  Activity,
  LogOut,
} from 'lucide-react'
import { cn }             from '@/lib/utils/cn'
import { forceLogout }    from '@/lib/auth/logout'
import { useAuth }        from '@/providers/AuthProvider'
import { usePermissions } from '@/hooks/usePermissions'
import { Logo }           from '@/components/brand/Logo'
import { ExodoTechLink }  from '@/components/brand/PoweredBy'
import type { NavItem }   from '@/types/ui/nav'
import type { TenantSettings } from '@/types/domain/tenant'

const ROLE_LABELS: Record<string, string> = {
  owner:        'Proprietário',
  manager:      'Gestor',
  receptionist: 'Recepcionista',
  staff:        'Colaborador',
}

export function SidebarDesktop() {
  const pathname  = usePathname()
  const { tenant, profile } = useAuth()
  const { can }   = usePermissions()

  const settings  = tenant?.settings as TenantSettings | null | undefined
  const logoUrl   = settings?.branding?.logo_url

  const allNavItems: NavItem[] = [
    { href: '/dashboard',               label: 'Dashboard',     icon: LayoutDashboard },
    { href: '/dashboard/agenda',        label: 'Agenda',        icon: Calendar,        permission: 'agenda.view_own' },
    { href: '/dashboard/clientes',      label: 'Clientes',      icon: Users,           permission: 'clients.view' },
    { href: '/dashboard/servicos',      label: 'Serviços',      icon: Briefcase,       permission: 'services.view' },
    { href: '/dashboard/recursos',      label: 'Recursos',      icon: Zap,             permission: 'resources.view' },
    { href: '/dashboard/conversas',     label: 'Conversas',     icon: MessageSquare,   permission: 'conversas.view' },
    { href: '/dashboard/financas',      label: 'Finanças',      icon: Wallet,          permission: 'financas.view' },
    { href: '/dashboard/relatorios',    label: 'Relatórios',    icon: BarChart2,       permission: 'relatorios.view' },
    { href: '/dashboard/equipa',        label: 'Equipa',        icon: UserCog,         permission: 'team.view' },
    { href: '/dashboard/auditoria',     label: 'Auditoria',     icon: ShieldCheck,     permission: 'audit.view' },
    { href: '/dashboard/sistema',       label: 'Sistema',       icon: Activity,        permission: 'system.view' },
    { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings,        permission: 'configuracoes.view' },
  ]

  const navItems = allNavItems.filter((item) => !item.permission || can(item.permission))

  function handleLogout() { void forceLogout() }

  return (
    <aside className={cn(
      'hidden xl:flex flex-col fixed left-0 top-0 bottom-0 w-64 overflow-y-auto z-40',
      // Gradiente dark refinado — da profundidade visual
      'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950',
      'border-r border-white/[0.06]',
    )}>
      {/* Marca luminosa no topo (decoração) */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 right-0 h-48 opacity-20"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, var(--tenant-primary), transparent)',
        }}
      />

      {/* MARCA DO PRODUTO — sempre visível, nunca substituída pelo logo do cliente */}
      <div className="relative px-5 py-5 border-b border-white/[0.07]">
        <Logo variant="horizontal" onDark />
      </div>

      {/* EMPRESA ATUAL — marca do tenant em área própria (logo opcional + nome) */}
      <div className="relative px-4 py-3 border-b border-white/[0.07]">
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Empresa atual</p>
        <div className="flex items-center gap-2 min-w-0">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={`Logo de ${tenant?.name ?? 'empresa'}`}
              className="h-7 w-7 rounded-lg object-contain bg-white/90 p-0.5 flex-shrink-0"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <span
              className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: 'color-mix(in srgb, var(--tenant-primary) 80%, #334155)' }}
            >
              {(tenant?.name ?? 'E').charAt(0).toUpperCase()}
            </span>
          )}
          <span className="text-sm font-medium text-slate-200 truncate">
            {tenant?.name ?? 'A carregar...'}
          </span>
        </div>
      </div>

      {/* Navegação */}
      <nav className="relative flex-1 px-3 py-5 space-y-0.5">
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
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
                'transition-all duration-150',
                isActive
                  ? 'text-white shadow-[0_2px_12px_rgba(0,0,0,0.25)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.07] active:bg-white/[0.12]'
              )}
              style={isActive ? {
                background: 'linear-gradient(135deg, var(--tenant-primary), color-mix(in srgb, var(--tenant-primary) 80%, #818cf8))',
              } : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
              {isActive && (
                <span
                  aria-hidden
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60"
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Rodapé */}
      <div className="relative px-3 py-4 border-t border-white/[0.07] space-y-1">
        {profile?.role && (
          <Link
            href="/dashboard/perfil"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.07] transition-all duration-150 group"
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: 'color-mix(in srgb, var(--tenant-primary) 40%, #475569)' }}
            >
              {(profile.full_name ?? 'U')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate group-hover:text-white transition-colors">
                {profile.full_name ?? 'Utilizador'}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {ROLE_LABELS[profile.role] ?? profile.role}
              </p>
            </div>
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-white/[0.07] hover:text-slate-300 transition-all duration-150"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
        {/* Marca da plataforma (discreta) — Êxodo Tech clicável */}
        <p className="px-3 pt-1 text-[10px] text-slate-600">
          ExodoFlow Pro · <ExodoTechLink className="text-slate-500 hover:text-slate-300" />
        </p>
      </div>
    </aside>
  )
}

export default SidebarDesktop
