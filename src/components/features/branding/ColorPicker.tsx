'use client'
// Seletor de cor com presets + input hex manual
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { COLOR_PRESETS } from '@/types/domain/tenant'

interface ColorPickerProps {
  label:    string
  value:    string
  onChange: (color: string) => void
  optional?: boolean
}

export function ColorPicker({ label, value, onChange, optional }: ColorPickerProps) {
  const [customHex, setCustomHex] = useState(value)

  function handlePreset(color: string) {
    setCustomHex(color)
    onChange(color)
  }

  function handleHexInput(raw: string) {
    setCustomHex(raw)
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) {
      onChange(raw)
    }
  }

  function handleNativeInput(e: React.ChangeEvent<HTMLInputElement>) {
    const color = e.target.value
    setCustomHex(color)
    onChange(color)
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {optional && <span className="ml-1 text-xs text-gray-400">(opcional)</span>}
      </label>

      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {COLOR_PRESETS.map((preset) => (
          <button
            key={preset.color}
            type="button"
            title={preset.label}
            onClick={() => handlePreset(preset.color)}
            className={cn(
              'h-8 w-8 rounded-full border-2 transition-all',
              preset.bg,
              value === preset.color
                ? 'border-gray-900 scale-110 shadow-md'
                : 'border-transparent hover:scale-105 hover:border-gray-400'
            )}
          />
        ))}
      </div>

      {/* Input hex + color picker nativo */}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value.startsWith('#') ? value : '#2563eb'}
          onChange={handleNativeInput}
          className="h-10 w-10 cursor-pointer rounded border border-gray-300 p-0.5"
          aria-label={`Cor personalizada para ${label}`}
        />
        <input
          type="text"
          value={customHex}
          onChange={(e) => handleHexInput(e.target.value)}
          placeholder="#2563eb"
          maxLength={7}
          className="h-10 w-32 rounded-lg border border-gray-300 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]"
        />
        {/* Preview do valor actual */}
        <span
          className="h-8 w-8 rounded-full border border-gray-200"
          style={{ backgroundColor: value }}
        />
      </div>
    </div>
  )
}
