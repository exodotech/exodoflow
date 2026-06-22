'use client'
// Pré-visualização do branding: mostra sidebar + botão com as cores escolhidas
import type { BrandingSettings } from '@/types/domain/tenant'

interface BrandingPreviewProps {
  branding: Partial<BrandingSettings>
  tenantName: string
}

export function BrandingPreview({ branding, tenantName }: BrandingPreviewProps) {
  const primary = branding.primary_color ?? '#2563eb'

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">Pré-visualização</p>
      <div
        className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
        style={{ '--tenant-primary': primary } as React.CSSProperties}
      >
        {/* Mini-sidebar */}
        <div className="flex h-40">
          <aside
            className="flex w-20 flex-col gap-1 p-2"
            style={{ backgroundColor: '#f9fafb' }}
          >
            {/* Logo placeholder */}
            <div
              className="mb-2 flex h-8 w-full items-center justify-center rounded-lg text-white text-xs font-bold"
              style={{ backgroundColor: primary }}
            >
              {tenantName.slice(0, 2).toUpperCase()}
            </div>
            {/* Nav items */}
            {['Agenda', 'Clientes', 'Serviços'].map((item, i) => (
              <div
                key={item}
                className="rounded-md px-2 py-1 text-xs"
                style={
                  i === 0
                    ? { backgroundColor: primary, color: '#fff' }
                    : { color: '#6b7280' }
                }
              >
                {item}
              </div>
            ))}
          </aside>

          {/* Conteúdo */}
          <main className="flex flex-1 flex-col gap-2 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-800">Agenda de hoje</span>
              {/* Botão primário */}
              <button
                className="rounded-md px-3 py-1 text-xs font-medium text-white"
                style={{ backgroundColor: primary }}
              >
                + Nova
              </button>
            </div>
            {/* Cards simulados */}
            <div className="space-y-1">
              {[1, 2].map((n) => (
                <div key={n} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-2 py-1.5">
                  <span
                    className="h-2 w-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: n === 1 ? primary : '#cbd5e1' }}
                  />
                  <div className="flex-1 space-y-0.5">
                    <div className="h-1.5 w-16 rounded bg-gray-200" />
                    <div className="h-1 w-10 rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
