import React from 'react'
import BottomNav from '@/components/layout/BottomNav/BottomNav'
import MobileHeader from '@/components/layout/MobileHeader/MobileHeader'
import SidebarDesktop from '@/components/layout/SidebarDesktop/SidebarDesktop'
import SidebarTablet from '@/components/layout/SidebarTablet/SidebarTablet'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Mobile (até md: 640px) — dá acesso à conta própria */}
      <MobileHeader />

      {/* Sidebar Tablet (md: 640px - lg: 1024px) */}
      <SidebarTablet />

      {/* Sidebar Desktop (xl: 1280px+) */}
      <SidebarDesktop />

      {/* Main Content */}
      <main className="md:ml-32 lg:ml-0 xl:ml-64 pb-20 sm:pb-0 md:pb-0 lg:pb-0 xl:pb-0">
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </main>

      {/* BottomNav Mobile (up to md: 640px) */}
      <BottomNav />
    </div>
  )
}

export default DashboardLayout
