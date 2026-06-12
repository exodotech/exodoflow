import React from 'react'
import Link from 'next/link'
import { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/features/auth/ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Recuperar palavra-passe — ExodoFlow AI',
}

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-4">
          <span className="text-white font-bold text-lg">E</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Recuperar acesso</h1>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm rounded-xl border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Esqueceu a palavra-passe?</h2>
          <ForgotPasswordForm />
          <p className="mt-6 text-center text-xs text-gray-400">
            Lembrou-se?{' '}
            <Link href="/login" className="text-gray-500 hover:underline">Voltar ao login</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
