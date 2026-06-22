import React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

// Link discreto para o website da Êxodo Tech. Reutilizável em todos os rodapés
// ("Powered by Êxodo Tech" / "by Êxodo Tech") para garantir consistência.
// Abre em nova aba com rel de segurança; hover elegante; acessível.
export const EXODOTECH_URL = 'https://www.exodotech.com'

export function ExodoTechLink({ className }: { className?: string }) {
  return (
    <a
      href={EXODOTECH_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Êxodo Tech (abre em nova aba)"
      className={cn(
        'font-medium underline-offset-2 transition-colors cursor-pointer hover:underline',
        'focus-visible:outline-none focus-visible:underline rounded-sm',
        className,
      )}
    >
      Êxodo Tech
    </a>
  )
}

// Rodapé "Powered by Êxodo Tech" (Êxodo Tech clicável). Para telas claras.
// `legal`: nas páginas públicas, mostra também os links Privacidade · Termos.
export function PoweredBy({ className, legal }: { className?: string; legal?: boolean }) {
  return (
    <div className={cn('text-xs text-slate-400 dark:text-slate-400', className)}>
      <p>
        Powered by{' '}
        <ExodoTechLink className="text-slate-500 dark:text-slate-300 hover:text-[color:var(--brand)]" />
      </p>
      {legal && (
        <p className="mt-1.5">
          <Link href="/privacidade" className="text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline-offset-2 hover:underline">Privacidade</Link>
          <span className="mx-1.5">·</span>
          <Link href="/termos" className="text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline-offset-2 hover:underline">Termos</Link>
        </p>
      )}
    </div>
  )
}

export default PoweredBy
