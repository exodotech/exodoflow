import React from 'react'
import { Metadata } from 'next'
import { ResetPasswordForm } from '@/components/features/auth/ResetPasswordForm'
import { Logo } from '@/components/brand/Logo'

export const metadata: Metadata = {
  title: 'Definir nova palavra-passe — ExodoFlow Pro',
}

export default function ResetPasswordPage() {
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
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Definir nova palavra-passe</h2>
          <ResetPasswordForm />
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Powered by <span className="font-medium text-slate-500">Êxodo Tech</span>
        </p>
      </div>
    </main>
  )
}
