// Layout raiz da aplicação ExodoFlow Pro
// Envolve toda a app com os providers necessários (TanStack Query)
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { QueryProvider } from '@/providers/QueryProvider'
import './globals.css'

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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* QueryProvider activa useQuery/useMutation em toda a aplicação */}
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
