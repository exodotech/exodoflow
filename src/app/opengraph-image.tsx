import { ImageResponse } from 'next/og'

// Imagem Open Graph (1200×630) gerada com a marca ExodoFlow Pro — usada nas
// partilhas em redes sociais / mensagens. Estática (sem dados de tenant).
export const alt = 'ExodoFlow Pro — Tecnologia inteligente para gerir o seu negócio'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0b1220 0%, #0d9488 60%, #134e4a 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Marca do chevron (cyan → lime) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28 }}>
          <div style={{ display: 'flex', fontSize: 84, fontWeight: 800, letterSpacing: -2 }}>
            <span style={{ color: '#22c9ef' }}>{'<'}</span>
            <span style={{ color: '#a3e635' }}>{'>'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <span style={{ fontSize: 76, fontWeight: 800 }}>ExodoFlow</span>
            <span
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: '#0b1220',
                background: '#a3e635',
                padding: '4px 14px',
                borderRadius: 10,
              }}
            >
              PRO
            </span>
          </div>
        </div>

        <div style={{ fontSize: 34, color: '#cbd5e1', maxWidth: 900, textAlign: 'center' }}>
          Tecnologia inteligente para gerir o seu negócio
        </div>

        <div style={{ marginTop: 48, fontSize: 22, color: '#94a3b8' }}>
          Powered by Êxodo Tech
        </div>
      </div>
    ),
    { ...size },
  )
}
