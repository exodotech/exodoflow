import type { MetadataRoute } from 'next'

// Web App Manifest (PWA) — torna a app instalável e dá metadados de marca.
// O ícone é o badge da marca (app/icon.svg), servido em /icon.svg.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ExodoFlow Pro',
    short_name: 'ExodoFlow',
    description: 'Gestão simples e inteligente para o seu negócio — agenda, clientes e automação.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0d9488',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  }
}
