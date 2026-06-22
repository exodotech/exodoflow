'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'

// Navegação da landing pública. Fixa no topo, ganha fundo "glass" ao fazer
// scroll, e colapsa num menu mobile (hambúrguer) abaixo de md.
const NAV_LINKS = [
  { href: '#funcionalidades', label: 'Funcionalidades' },
  { href: '#como-funciona',   label: 'Como funciona' },
  { href: '#precos',          label: 'Preços' },
  { href: '#faq',             label: 'Perguntas' },
]

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // Fundo glass só depois de sair do topo — hero limpo no arranque.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={[
        'fixed top-0 inset-x-0 z-50 transition-all duration-200',
        scrolled
          ? 'bg-white/80 backdrop-blur-md border-b border-[var(--border-subtle)] shadow-[var(--shadow-xs)]'
          : 'bg-transparent border-b border-transparent',
      ].join(' ')}
    >
      <nav className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8" aria-label="Principal">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Marca — leva ao topo */}
          <Link href="#topo" className="flex-shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]" aria-label="ExodoFlow Pro — início">
            <Logo variant="horizontal" />
          </Link>

          {/* Links — desktop */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="px-3 py-2 text-sm font-medium text-slate-600 rounded-lg transition-colors hover:text-slate-900 hover:bg-slate-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Ações — desktop */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-slate-700 rounded-xl transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center h-10 px-5 rounded-xl text-white text-sm font-semibold shadow-[var(--shadow-sm)] transition-all hover:opacity-90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--brand)]"
              style={{ backgroundImage: 'var(--brand-cta-gradient)' }}
            >
              Pedir acesso
            </Link>
          </div>

          {/* Botão menu — mobile */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 -mr-2 rounded-xl text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
            aria-expanded={menuOpen}
            aria-controls="menu-mobile"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Painel mobile */}
        {menuOpen && (
          <div
            id="menu-mobile"
            className="md:hidden pb-4 animate-slide-down"
          >
            <div className="flex flex-col gap-1 rounded-2xl border border-[var(--border-subtle)] bg-white/95 backdrop-blur-md p-2 shadow-[var(--shadow-md)]">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-3 text-sm font-medium text-slate-700 rounded-xl transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                >
                  {l.label}
                </a>
              ))}
              <div className="h-px bg-[var(--border-subtle)] my-1.5" />
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="px-4 py-3 text-sm font-semibold text-slate-700 rounded-xl transition-colors hover:bg-slate-100 text-center"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                onClick={() => setMenuOpen(false)}
                className="inline-flex items-center justify-center h-12 px-5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundImage: 'var(--brand-cta-gradient)' }}
              >
                Pedir acesso
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}

export default LandingNav
