'use client'
// Componente de acesso negado — exibido quando utilizador acede a área sem permissão
import React from 'react'
import { Lock } from 'lucide-react'

interface AccessDeniedProps {
  title?:       string
  description?: string
}

export function AccessDenied({
  title       = 'Acesso Restrito',
  description = 'Não tem permissão para aceder a esta área. Contacte o administrador se precisar de acesso.',
}: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[320px] py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center mb-5">
        <Lock className="w-7 h-7 text-red-400" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-sm text-gray-500 max-w-sm">{description}</p>
    </div>
  )
}

export default AccessDenied
