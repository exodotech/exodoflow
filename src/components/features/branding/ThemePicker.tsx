'use client'
// Seletor de tema: light | dark | system
import { cn } from '@/lib/utils/cn'
import type { ThemeMode } from '@/types/domain/tenant'

const OPTIONS: { value: ThemeMode; label: string; description: string }[] = [
  { value: 'light',  label: 'Claro',    description: 'Sempre fundo branco' },
  { value: 'dark',   label: 'Escuro',   description: 'Sempre fundo escuro' },
  { value: 'system', label: 'Sistema',  description: 'Segue as preferências do dispositivo' },
]

interface ThemePickerProps {
  value:    ThemeMode
  onChange: (mode: ThemeMode) => void
}

export function ThemePicker({ value, onChange }: ThemePickerProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Tema visual</label>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 text-center transition-all',
              value === opt.value
                ? 'border-[color:var(--tenant-primary)] bg-blue-50 text-gray-900'
                : 'border-gray-200 hover:border-gray-300 text-gray-600'
            )}
          >
            <ThemeIcon mode={opt.value} active={value === opt.value} />
            <span className="text-sm font-medium">{opt.label}</span>
            <span className="text-xs text-gray-500 leading-tight">{opt.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ThemeIcon({ mode, active }: { mode: ThemeMode; active: boolean }) {
  const color = active ? 'var(--tenant-primary)' : '#9ca3af'
  if (mode === 'light') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1"  x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3"  y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36" />
        <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22" />
      </svg>
    )
  }
  if (mode === 'dark') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    )
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}
