import React from 'react'
import Link from 'next/link'
import { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/features/auth/ForgotPasswordForm'
import { Logo } from '@/components/brand/Logo'

export const metadata: Metadata = {
  title: 'Recuperar palavra-passe — ExodoFlow Pro',
}

export default function ForgotPasswordPage() {
  return (
    <main
      className="min-h-screen app-bg flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8"
      style={{ ['--tenant-primary' as string]: 'var(--brand)' }}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8">
        <Logo variant="full" className="w-full" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/80 backdrop-blur-sm py-8 px-6 shadow-sm rounded-2xl border border-white/60">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Esqueceu a palavra-passe?</h2>
          <ForgotPasswordForm />
          <p className="mt-6 text-center text-xs text-slate-400">
            Lembrou-se?{' '}
            <Link href="/login" className="text-slate-500 hover:underline">Voltar ao login</Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Powered by <span className="font-medium text-slate-500">Êxodo Tech</span>
        </p>
      </div>
    </main>
  )
}
