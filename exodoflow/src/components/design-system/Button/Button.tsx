import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'

// Define variantes de Button com mobile-first e micro-interacções premium
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 font-semibold rounded-xl',
    'transition-all duration-150 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    'whitespace-nowrap select-none',
    // Press state universal — leve scale down
    'active:scale-[0.97]',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: [
          // Cor base = --tenant-primary; se --btn-gradient estiver definido (telas
          // de auth), o gradiente da marca pinta por cima. Default 'none'.
          '[background-color:var(--tenant-primary)] [background-image:var(--btn-gradient,none)] text-white',
          'shadow-[0_2px_8px_color-mix(in_srgb,var(--tenant-primary)_30%,transparent)]',
          'hover:opacity-90 hover:shadow-[0_4px_16px_color-mix(in_srgb,var(--tenant-primary)_35%,transparent)]',
          'active:opacity-80',
          'focus-visible:ring-[var(--tenant-primary)]',
        ].join(' '),
        secondary: [
          'bg-slate-100 text-slate-700',
          'hover:bg-slate-200 hover:shadow-[0_2px_8px_rgba(15,23,42,0.08)]',
          'active:bg-slate-300',
          'focus-visible:ring-slate-500',
        ].join(' '),
        danger: [
          'bg-red-600 text-white',
          'shadow-[0_2px_8px_rgba(220,38,38,0.25)]',
          'hover:bg-red-700 hover:shadow-[0_4px_16px_rgba(220,38,38,0.30)]',
          'active:bg-red-800',
          'focus-visible:ring-red-500',
        ].join(' '),
        ghost: [
          'text-slate-600',
          'hover:bg-slate-100 hover:text-slate-900',
          'active:bg-slate-200',
          'focus-visible:ring-slate-500',
        ].join(' '),
        outline: [
          'border border-slate-200 bg-white/60 text-slate-700',
          'hover:bg-white hover:border-slate-300 hover:shadow-[0_2px_8px_rgba(15,23,42,0.06)]',
          'active:bg-slate-50',
          'focus-visible:ring-slate-400',
        ].join(' '),
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4 text-sm',    // 44px — Apple HIG touch target
        lg: 'h-13 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  fullWidth?: boolean
  isLoading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, isLoading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        buttonVariants({ variant, size }),
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin h-4 w-4 flex-shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  )
)

Button.displayName = 'Button'

export default Button
