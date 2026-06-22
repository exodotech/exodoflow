import Link from 'next/link'
import { ArrowRight, Sparkles, Calendar, Check, ShieldCheck, Lock, EyeOff } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { PoweredBy } from '@/components/brand/PoweredBy'
import { NICHE_TEMPLATES } from '@/lib/niche-templates'
import { FEATURES, STEPS } from '@/lib/marketing/landing-data'

// Secções estáticas da landing (Server Components). As partes interativas
// (nav, preços, FAQ) vivem em ficheiros 'use client' separados.

// Palavra com o gradiente da marca (cyan → lima).
function Brandtext({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="bg-clip-text text-transparent"
      style={{ backgroundImage: 'linear-gradient(90deg, var(--brand-from), var(--brand-to))' }}
    >
      {children}
    </span>
  )
}

// ── HERO ──────────────────────────────────────────────────────────────────────
export function Hero() {
  return (
    <section id="topo" className="relative overflow-hidden pt-32 sm:pt-40 pb-20 sm:pb-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Copy */}
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-white/70 px-3 py-1 text-xs font-semibold text-slate-600 shadow-[var(--shadow-xs)]">
              <Sparkles className="w-3.5 h-3.5 text-[var(--brand)]" aria-hidden="true" />
              Agenda + automação com IA
            </span>

            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.05]">
              A sua agenda cheia,{' '}
              <Brandtext>sem o trabalho manual</Brandtext>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Marcações online, portal 24/7, lembretes automáticos e assistente
              com IA — a plataforma completa para gerir e fazer crescer o seu
              negócio de serviços.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
              <Link
                href="/register"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 h-13 px-7 rounded-xl text-white text-base font-semibold shadow-[var(--shadow-lg)] transition-all hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--brand)]"
                style={{ backgroundImage: 'var(--brand-cta-gradient)' }}
              >
                Pedir acesso
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className="inline-flex w-full sm:w-auto items-center justify-center h-13 px-7 rounded-xl text-base font-semibold border border-slate-200 bg-white/70 text-slate-700 transition-all hover:bg-white hover:border-slate-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--brand)]"
              >
                Entrar
              </Link>
            </div>

            <p className="mt-5 flex items-center gap-2 justify-center lg:justify-start text-sm text-slate-500">
              <Check className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              Plano gratuito para começar · Sem cartão de crédito
            </p>
          </div>

          {/* Visual decorativo — mock de agenda (não é um screenshot real) */}
          <div className="relative" aria-hidden="true">
            <div
              className="absolute -inset-8 -z-10 opacity-60 blur-3xl"
              style={{ background: 'radial-gradient(circle at 70% 30%, rgba(34,201,239,0.18), transparent 60%), radial-gradient(circle at 30% 80%, rgba(163,230,53,0.16), transparent 60%)' }}
            />
            <div className="glass-card rounded-2xl p-5 sm:p-6 shadow-[var(--shadow-xl)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[var(--brand)]" />
                  <span className="font-semibold text-slate-900">Hoje</span>
                </div>
                <span className="text-xs font-medium text-slate-400">4 marcações</span>
              </div>

              <div className="mt-4 space-y-2.5">
                {[
                  { h: '09:00', n: 'Maria Oliveira', s: 'Limpeza de pele', c: '#6366f1' },
                  { h: '10:30', n: 'João Santos',    s: 'Massagem relaxante', c: '#ec4899' },
                  { h: '14:00', n: 'Ana Costa',      s: 'Manicure', c: '#14b8a6' },
                ].map((b) => (
                  <div key={b.h} className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-white/80 px-3 py-2.5">
                    <span className="w-1.5 h-9 rounded-full" style={{ backgroundColor: b.c }} />
                    <span className="text-sm font-semibold text-slate-700 tabular-nums w-12">{b.h}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{b.n}</p>
                      <p className="text-xs text-slate-500 truncate">{b.s}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Toast de marcação pelo portal */}
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white">
                  <Check className="w-4 h-4" />
                </span>
                <p className="text-xs text-emerald-900">
                  <span className="font-semibold">Nova marcação pelo portal</span> — 16:30, sem telefonema.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tira de nichos */}
        <div className="mt-16 sm:mt-20">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
            Feito para negócios de serviços
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            {NICHE_TEMPLATES.map((n) => (
              <span
                key={n.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-white/60 px-3.5 py-1.5 text-sm text-slate-600"
              >
                <span aria-hidden="true">{n.emoji}</span>
                {n.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── FUNCIONALIDADES ───────────────────────────────────────────────────────────
export function Features() {
  return (
    <section id="funcionalidades" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-[var(--brand)]">Funcionalidades</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Tudo o que o seu negócio precisa
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Uma plataforma completa para marcar, gerir clientes e automatizar o dia a dia.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="group rounded-2xl border border-[var(--border-subtle)] bg-white/80 backdrop-blur-sm p-6 transition-all hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5"
              >
                <span
                  className="inline-flex items-center justify-center w-11 h-11 rounded-xl text-white shadow-[var(--shadow-sm)] transition-transform group-hover:scale-105"
                  style={{ backgroundImage: 'var(--brand-cta-gradient)' }}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-bold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── COMO FUNCIONA ───────────────────────────────────────────────────────────────
export function HowItWorks() {
  return (
    <section id="como-funciona" className="scroll-mt-24 py-20 sm:py-28 bg-white/50 border-y border-[var(--border-subtle)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-[var(--brand)]">Como funciona</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            A funcionar em três passos
          </h2>
        </div>

        <ol className="mt-14 grid gap-8 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.number} className="relative text-center md:text-left">
              <span
                className="inline-flex items-center justify-center w-12 h-12 rounded-2xl text-lg font-extrabold text-white shadow-[var(--shadow-md)]"
                style={{ backgroundImage: 'var(--brand-cta-gradient)' }}
              >
                {s.number}
              </span>
              <h3 className="mt-5 text-lg font-bold text-slate-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

// ── SEGURANÇA / PRIVACIDADE ─────────────────────────────────────────────────────
const TRUST = [
  { icon: ShieldCheck, title: 'Dados isolados por empresa', desc: 'Isolamento multi-tenant: a sua empresa nunca vê — nem é vista por — outra.' },
  { icon: Lock,        title: 'LGPD e RGPD',                desc: 'Pedidos de titulares, retenção de dados e registo de auditoria das ações sensíveis.' },
  { icon: EyeOff,      title: 'Sem venda de dados',         desc: 'Não vendemos dados nem usamos rastreio não essencial. Os dados são seus.' },
]

export function Security() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-[var(--border-subtle)] bg-white/80 backdrop-blur-sm p-8 sm:p-12 shadow-[var(--shadow-sm)]">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-[var(--brand)]">Privacidade e segurança</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              Os dados dos seus clientes, protegidos
            </h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {TRUST.map((t) => {
              const Icon = t.icon
              return (
                <div key={t.title} className="text-center">
                  <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[color:var(--brand)]/10 text-[var(--brand)]">
                    <Icon className="w-6 h-6" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-slate-900">{t.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{t.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── CTA FINAL (faixa escura para contraste premium) ───────────────────────────
export function FinalCta() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 px-6 py-16 sm:px-16 text-center shadow-[var(--shadow-xl)]">
          {/* Brilho da marca */}
          <div
            className="absolute -inset-px -z-0 opacity-60"
            style={{ background: 'radial-gradient(ellipse 60% 80% at 50% 0%, rgba(34,201,239,0.22), transparent 60%), radial-gradient(ellipse 50% 70% at 100% 100%, rgba(163,230,53,0.18), transparent 60%)' }}
            aria-hidden="true"
          />
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Pronto para encher a sua agenda?
            </h2>
            <p className="mt-4 text-lg text-slate-300 max-w-xl mx-auto">
              Comece grátis hoje. Em minutos tem o seu portal de marcações a funcionar.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 justify-center">
              <Link
                href="/register"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 h-13 px-7 rounded-xl text-white text-base font-semibold shadow-lg transition-all hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-[var(--brand-from)]"
                style={{ backgroundImage: 'var(--brand-cta-gradient)' }}
              >
                Pedir acesso
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className="inline-flex w-full sm:w-auto items-center justify-center h-13 px-7 rounded-xl text-base font-semibold border border-white/20 bg-white/5 text-white transition-all hover:bg-white/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-white"
              >
                Já tenho conta
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── FOOTER ────────────────────────────────────────────────────────────────────
export function Footer() {
  return (
    <footer className="border-t border-[var(--border-subtle)] bg-white/60 dark:bg-white/[0.02]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <Logo variant="horizontal" />
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Tecnologia inteligente para gerir o seu negócio.
            </p>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm" aria-label="Rodapé">
            <a href="#funcionalidades" className="text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Funcionalidades</a>
            <a href="#precos" className="text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Preços</a>
            <a href="#faq" className="text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Perguntas</a>
            <Link href="/login" className="text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Entrar</Link>
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-400 dark:text-slate-400">
            © {new Date().getFullYear()} ExodoFlow Pro. Todos os direitos reservados.
          </p>
          <PoweredBy legal />
        </div>
      </div>
    </footer>
  )
}
