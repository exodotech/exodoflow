'use client'
// Botão de tema (sol ↔ lua) com transição suave. Reflete o tema atual e alterna.
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/providers/ThemeProvider'
import { cn } from '@/lib/utils/cn'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      aria-pressed={dark}
      title={dark ? 'Tema claro' : 'Tema escuro'}
      className={cn(
        'relative inline-flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--brand)]',
        className,
      )}
    >
      {/* Crossfade + rotação entre sol e lua */}
      <Sun
        className={cn(
          'w-5 h-5 absolute transition-all duration-300 ease-out',
          dark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100',
        )}
        aria-hidden="true"
      />
      <Moon
        className={cn(
          'w-5 h-5 absolute transition-all duration-300 ease-out',
          dark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50',
        )}
        aria-hidden="true"
      />
    </button>
  )
}

export default ThemeToggle
