'use client'
// Navegação do painel SUPERADMIN. O acesso já é garantido server-side no
// admin/layout.tsx (role === 'superadmin'); isto é só a navegação entre secções.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, Users, Activity, LayoutDashboard, CreditCard } from 'lucide-react'

const ITEMS = [
  { href: '/admin',              label: 'Visão geral', icon: LayoutDashboard, exact: true },
  { href: '/admin/empresas',     label: 'Empresas',    icon: Building2 },
  { href: '/admin/planos',       label: 'Planos',      icon: CreditCard },
  { href: '/admin/utilizadores', label: 'Owners',      icon: Users },
  { href: '/admin/sistema',      label: 'Sistema',     icon: Activity },
]

export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-1.5 overflow-x-auto scrollbar-none mb-8 p-1 rounded-xl bg-white/60 backdrop-blur-sm border border-white/60 shadow-sm w-fit max-w-full">
      {ITEMS.map((item) => {
        const Icon = item.icon
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 flex-shrink-0 px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
              active
                ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-md shadow-indigo-500/25'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/80'
            }`}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
