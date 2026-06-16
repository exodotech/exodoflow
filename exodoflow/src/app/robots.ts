import type { MetadataRoute } from 'next'

// robots.txt — impede a indexação de áreas privadas (dashboard, admin, API,
// onboarding, diagnostics) pelos motores de busca. O portal público de marcação
// (/marcar/...) e o login/landing ficam indexáveis.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/admin', '/admin/', '/api/', '/onboarding', '/dev/', '/suspenso'],
      },
    ],
  }
}
