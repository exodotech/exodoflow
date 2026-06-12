// Layout raiz da aplicação ExodoFlow AI
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
  title:       'ExodoFlow AI — Agenda Inteligente',
  description: 'Plataforma SaaS de agendamento e automação com IA para negócios de serviços',
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
