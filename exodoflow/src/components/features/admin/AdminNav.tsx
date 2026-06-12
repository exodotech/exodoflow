'use client'
// Navegação do painel SUPERADMIN. O acesso já é garantido server-side no
// admin/layout.tsx (role === 'superadmin'); isto é só a navegação entre secções.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, Users, Activity, LayoutDashboard } from 'lucide-react'

const ITEMS = [
  { href: '/admin',              label: 'Visão geral', icon: LayoutDashboard, exact: true },
  { href: '/admin/empresas',     label: 'Empresas',    icon: Building2 },
  { href: '/admin/utilizadores', label: 'Owners',      icon: Users },
  { href: '/admin/sistema',      label: 'Sistema',     icon: Activity },
]

export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-1 overflow-x-auto scrollbar-none border-b border-gray-200 mb-6">
      {ITEMS.map((item) => {
        const Icon = item.icon
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 flex-shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
