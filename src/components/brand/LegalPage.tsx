import React from 'react'
import Link from 'next/link'
import { Logo }      from '@/components/brand/Logo'
import { PoweredBy } from '@/components/brand/PoweredBy'

// Layout partilhado das páginas legais. Mostra um aviso HONESTO de que o
// documento está em preparação / pendente de revisão jurídica — NÃO contém
// texto jurídico definitivo (esse é redigido por advogado antes do uso real).
export function LegalPage({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <main
      className="min-h-screen app-bg flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8"
      style={{ ['--tenant-primary' as string]: 'var(--brand)' }}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8">
        <Logo variant="full" showTagline className="w-full" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white/80 backdrop-blur-sm py-8 px-6 sm:px-8 shadow-sm rounded-2xl border border-white/60">
          <h1 className="text-xl font-semibold text-slate-900">{titulo}</h1>
          <p className="text-sm text-slate-600 mt-2">{descricao}</p>

          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">Documento em preparação</p>
            <p className="text-sm text-amber-800 mt-1">
              A versão definitiva está a ser preparada e será publicada após revisão
              jurídica, antes da disponibilização comercial do serviço. Até lá, para
              questões sobre dados ou condições de utilização, contacte-nos.
            </p>
          </div>

          <div className="mt-6 text-sm text-slate-600">
            <p>Contacto: <a className="text-[color:var(--brand)] hover:underline" href="https://www.exodotech.com" target="_blank" rel="noopener noreferrer">Êxodo Tech</a></p>
          </div>

          <div className="mt-8">
            <Link href="/login" className="text-sm text-slate-500 hover:text-slate-700">← Voltar</Link>
          </div>
        </div>

        <PoweredBy className="mt-6 text-center" legal />
      </div>
    </main>
  )
}
