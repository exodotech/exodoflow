// Layout raiz da aplicação ExodoFlow Pro
// Envolve toda a app com os providers necessários (TanStack Query)
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { QueryProvider } from '@/providers/QueryProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'
import './globals.css'

// Script anti-FOUC: aplica o tema (classe .dark + color-scheme) ANTES da pintura,
// lendo a preferência guardada ou, na ausência dela, o tema do sistema. Evita o
// "flash" de tema claro ao carregar com tema escuro escolhido.
const THEME_INIT = `(function(){try{var k='exodo-theme',s=localStorage.getItem(k),d=s?s==='dark':matchMedia('(prefers-color-scheme: dark)').matches,e=document.documentElement;if(d)e.classList.add('dark');e.style.colorScheme=d?'dark':'light';}catch(e){}})();`

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets:  ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets:  ['latin'],
})

export const metadata: Metadata = {
  title:       'ExodoFlow Pro — Tecnologia inteligente para gerir o seu negócio',
  description: 'ExodoFlow Pro — gestão simples e inteligente para empresas. Agenda, clientes e automação num só lugar. Powered by Êxodo Tech.',
  applicationName: 'ExodoFlow Pro',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt"
      // suppressHydrationWarning: o script anti-FOUC altera a classe do <html>
      // antes da hidratação, o que é esperado (não é um mismatch real).
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Anti-FOUC: corre antes da pintura para aplicar o tema guardado/sistema */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        {/* ThemeProvider (preferência por utilizador) + QueryProvider (data) */}
        <ThemeProvider>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
