'use client'
import React, { useEffect, useRef, useId } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export interface ModalProps {
  isOpen:       boolean
  onClose:      () => void
  title?:       string
  children:     React.ReactNode
  footer?:      React.ReactNode
  closeButton?: boolean
  size?:        'sm' | 'md' | 'lg'
  className?:   string
}

const sizeClasses = {
  sm: 'w-11/12 max-w-sm',
  md: 'w-11/12 max-w-md',
  lg: 'w-11/12 max-w-lg',
}

export function Modal({ isOpen, onClose, title, children, footer, closeButton = true, size = 'md', className }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'auto' }
  }, [isOpen])

  // Gestão de foco (a11y): ao abrir, guarda o foco anterior e move o foco para o
  // diálogo; ao fechar, devolve o foco a quem abriu o modal.
  useEffect(() => {
    if (!isOpen) return
    const anterior = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    return () => { anterior?.focus?.() }
  }, [isOpen])

  // Escape fecha; Tab fica preso dentro do diálogo (focus trap, WCAG 2.4.3).
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const f = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (!f || f.length === 0) return
      const primeiro = f[0], ultimo = f[f.length - 1]
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus() }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    // Overlay com backdrop-blur — suavidade visual e foco no conteúdo
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(15, 23, 42, 0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Blur no fundo */}
      <div
        className="absolute inset-0 -z-10"
        style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        aria-hidden
      />

      {/* Card Glass */}
      <div
        className={cn(
          'relative flex flex-col max-h-[90dvh] overflow-hidden',
          'rounded-2xl animate-slide-up',
          // Glass overlay
          'bg-white/95',
          'border border-white/70',
          'shadow-[0_24px_64px_rgba(15,23,42,0.18),0_8px_24px_rgba(15,23,42,0.10)]',
          sizeClasses[size],
          className
        )}
        style={{ backdropFilter: 'blur(20px) saturate(1.6)', WebkitBackdropFilter: 'blur(20px) saturate(1.6)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        ref={dialogRef}
        tabIndex={-1}
      >
        {/* Brilho decorativo no topo */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)' }}
        />

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
            <h2 id={titleId} className="text-base font-semibold text-slate-900 tracking-tight">{title}</h2>
            {closeButton && (
              <button
                onClick={onClose}
                className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-150"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="px-5 py-5 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/60">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default Modal
