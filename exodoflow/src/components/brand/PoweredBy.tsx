import React from 'react'
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
export function PoweredBy({ className }: { className?: string }) {
  return (
    <p className={cn('text-xs text-slate-400', className)}>
      Powered by{' '}
      <ExodoTechLink className="text-slate-500 hover:text-[color:var(--brand)]" />
    </p>
  )
}

export default PoweredBy
