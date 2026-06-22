'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { FAQ } from '@/lib/marketing/landing-data'

// FAQ em acordeão acessível. Cada item é um botão que controla a sua resposta
// (aria-expanded / aria-controls). Permite várias abertas em simultâneo.
export function LandingFaq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold text-[var(--brand)]">Perguntas frequentes</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Tudo o que precisa de saber
          </h2>
        </div>

        <div className="mt-12 space-y-3">
          {FAQ.map((item, i) => {
            const isOpen = open === i
            return (
              <div
                key={item.question}
                className="rounded-2xl border border-[var(--border-subtle)] bg-white/80 backdrop-blur-sm overflow-hidden transition-shadow hover:shadow-[var(--shadow-sm)]"
              >
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-resposta-${i}`}
                    className="flex w-full items-center justify-between gap-4 px-5 sm:px-6 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]"
                  >
                    <span className="text-base font-semibold text-slate-900">{item.question}</span>
                    <ChevronDown
                      className={[
                        'w-5 h-5 flex-shrink-0 text-slate-400 transition-transform duration-200',
                        isOpen ? 'rotate-180' : '',
                      ].join(' ')}
                      aria-hidden="true"
                    />
                  </button>
                </h3>
                {isOpen && (
                  <div id={`faq-resposta-${i}`} className="px-5 sm:px-6 pb-5 -mt-1 animate-slide-down">
                    <p className="text-sm leading-relaxed text-slate-600">{item.answer}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default LandingFaq
