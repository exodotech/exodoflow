import React from 'react'
import { cn } from '@/lib/utils/cn'

// Logótipo ExodoFlow Pro — recriação VETORIAL (SVG) da marca aprovada.
// Fundo transparente real, escala de favicon a header sem perder nitidez,
// lê bem em fundo claro e escuro. Cores: gradiente cyan → verde-lima + setas.
//
// Variantes:
//   'full'       — marca + wordmark + (opcional) tagline. Login/registo/onboarding.
//   'horizontal' — marca + wordmark inline. Sidebar/header/cabeçalho.
//   'icon'       — só o símbolo (setas). Favicon/app icon/sidebar compacta.

const CYAN = '#22c9ef'
const LIME = '#a3e635'

interface LogoProps {
  variant?:    'full' | 'horizontal' | 'icon'
  className?:  string
  showTagline?: boolean
  /** Em fundos escuros, o "Pro" e detalhes ajustam o contraste. */
  onDark?:     boolean
}

// ── Símbolo: duplas setas (‹‹ … ››) à volta de um núcleo, em gradiente ───────
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 32" className={className} role="img" aria-label="ExodoFlow" fill="none">
      <defs>
        <linearGradient id="ef-mark" x1="0" y1="0" x2="44" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={CYAN} />
          <stop offset="1" stopColor={LIME} />
        </linearGradient>
      </defs>
      {/* setas esquerda (‹‹) */}
      <path d="M19 6 L11 16 L19 26" stroke={CYAN} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 8 L5 16 L11 24"  stroke={CYAN} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* setas direita (››) */}
      <path d="M25 6 L33 16 L25 26" stroke={LIME} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M33 8 L39 16 L33 24" stroke={LIME} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* arco/flow inferior */}
      <path d="M12 28 Q22 33 32 28" stroke="url(#ef-mark)" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}

// ── Símbolo em "badge" (quadrado arredondado) — favicon / app icon ───────────
export function LogoBadge({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="ExodoFlow Pro" fill="none">
      <defs>
        <linearGradient id="ef-badge" x1="8" y1="10" x2="56" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={CYAN} />
          <stop offset="1" stopColor={LIME} />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#ef-badge)" />
      {/* setas em branco para máximo contraste a qualquer tamanho */}
      <g stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M28 20 L18 32 L28 44" />
        <path d="M38 20 L48 32 L38 44" opacity="0.92" />
      </g>
    </svg>
  )
}

// ── Wordmark + símbolo ───────────────────────────────────────────────────────
export function Logo({ variant = 'horizontal', className, showTagline = false, onDark = false }: LogoProps) {
  if (variant === 'icon') {
    return <LogoMark className={cn('h-7 w-auto', className)} />
  }

  const wordmark = (
    <span className="inline-flex items-baseline gap-1.5">
      <span
        className="font-extrabold tracking-tight leading-none bg-clip-text text-transparent"
        style={{ backgroundImage: `linear-gradient(90deg, ${CYAN}, ${LIME})` }}
      >
        ExodoFlow
      </span>
      <span
        className={cn(
          'font-semibold tracking-tight leading-none text-[0.55em] px-1.5 py-0.5 rounded-md',
          onDark ? 'bg-white/10 text-lime-300' : 'bg-slate-900/5 text-emerald-600',
        )}
      >
        PRO
      </span>
    </span>
  )

  if (variant === 'full') {
    return (
      <div className={cn('inline-flex flex-col items-center text-center gap-2', className)}>
        <div className="flex items-center gap-2.5">
          <LogoMark className="h-9 w-auto" />
          <span className="text-3xl">{wordmark}</span>
        </div>
        {showTagline && (
          <p className={cn('text-sm', onDark ? 'text-slate-400' : 'text-slate-500')}>
            Tecnologia inteligente para gerir o seu negócio.
          </p>
        )}
      </div>
    )
  }

  // horizontal (default)
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark className="h-6 w-auto flex-shrink-0" />
      <span className="text-lg">{wordmark}</span>
    </div>
  )
}

export default Logo
