import React from 'react'
import { Metadata } from 'next'
import { ResetPasswordForm } from '@/components/features/auth/ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Definir nova palavra-passe — ExodoFlow AI',
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-4">
          <span className="text-white font-bold text-lg">E</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Nova palavra-passe</h1>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm rounded-xl border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Definir nova palavra-passe</h2>
          <ResetPasswordForm />
        </div>
      </div>
    </main>
  )
}
