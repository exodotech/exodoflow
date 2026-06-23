'use client'
// Portal público de marcação — premium redesign com i18n (PT/EN/ES) e templates por nicho.
// Fala APENAS com /api/public/* (rate-limited, sem auth).
// Fluxo: serviço → data → hora → dados → confirmação.
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Calendar, Check, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, Loader2, Lock, Phone, User,
} from 'lucide-react'
import { PORTAL_STRINGS, detectPortalLang, type PortalLang } from '@/lib/i18n/portal'
import { getNicheTerms } from '@/lib/niche-templates'
import type { TenantNiche } from '@/types/domain/tenant'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Tenant {
  id:            string
  name:          string
  primary_color: string | null
  logo_url:      string | null
  business_type: string | null
}

interface Servico {
  id:               string
  name:             string
  duration_minutes: number
  price:            number | null
  color:            string | null
}

interface Slot {
  slot_start:  string
  slot_end:    string
  resource_id: string
}

type Passo = 'servico' | 'data' | 'hora' | 'dados' | 'feito'

// ── Componente principal ─────────────────────────────────────────────────────

export function PortalMarcacao({ slug }: { slug: string }) {
  const [carregando,  setCarregando]  = useState(true)
  const [indisponivel, setIndisponivel] = useState(false)
  const [tenant,      setTenant]      = useState<Tenant | null>(null)
  const [servicos,    setServicos]    = useState<Servico[]>([])

  const [passo,    setPasso]    = useState<Passo>('servico')
  const [servico,  setServico]  = useState<Servico | null>(null)
  const [data,     setData]     = useState('')
  const [slots,    setSlots]    = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slot,     setSlot]     = useState<Slot | null>(null)
  const [nome,     setNome]     = useState('')
  const [tel,      setTel]      = useState('')
  const [erro,     setErro]     = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [lang,     setLang]     = useState<PortalLang>(() => {
    if (typeof window === 'undefined') return 'pt'
    return detectPortalLang(new URLSearchParams(window.location.search).get('lang'))
  })

  const t    = PORTAL_STRINGS[lang]
  const hoje = new Date().toISOString().slice(0, 10)

  // Carregar tenant + serviços
  useEffect(() => {
    fetch(`/api/public/${slug}`)
      .then(async (r) => {
        if (!r.ok) { setIndisponivel(true); return }
        const d = await r.json() as { tenant: Tenant; services: Servico[] }
        setTenant(d.tenant)
        setServicos(d.services ?? [])
      })
      .catch(() => setIndisponivel(true))
      .finally(() => setCarregando(false))
  }, [slug])

  const carregarSlots = useCallback(async (svcId: string, dia: string) => {
    setLoadingSlots(true); setSlots([]); setSlot(null); setErro(null)
    try {
      const r = await fetch(`/api/public/${slug}/slots?service_id=${encodeURIComponent(svcId)}&date=${encodeURIComponent(dia)}`)
      const d = await r.json() as { slots?: Slot[] }
      setSlots(r.ok ? (d.slots ?? []) : [])
    } catch { setSlots([]) }
    finally { setLoadingSlots(false) }
  }, [slug])

  const horasDistintas = useMemo(() =>
    Array.from(new Map(slots.map((s) => [s.slot_start, s])).values())
      .sort((a, b) => a.slot_start.localeCompare(b.slot_start)),
    [slots],
  )

  function fmtHora(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  }
  function fmtData(dia: string) {
    return new Date(dia + 'T12:00:00').toLocaleDateString(
      lang === 'en' ? 'en-GB' : lang === 'es' ? 'es-ES' : 'pt-PT',
      { weekday: 'long', day: 'numeric', month: 'long' },
    )
  }
  function fmtPreco(price: number | null) {
    if (price == null || price === 0) return null
    return new Intl.NumberFormat(lang === 'en' ? 'en-GB' : lang === 'es' ? 'es-ES' : 'pt-PT', {
      style: 'currency', currency: 'EUR',
    }).format(price)
  }

  async function confirmar() {
    if (!servico || !slot) return
    if (nome.trim().length < 2) { setErro(t.nameRequired); return }
    setEnviando(true); setErro(null)
    try {
      const r = await fetch(`/api/public/${slug}/book`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          service_id:  servico.id,
          resource_id: slot.resource_id,
          start_at:    slot.slot_start,
          end_at:      slot.slot_end,
          name:        nome.trim(),
          phone:       tel.trim() || undefined,
        }),
      })
      const d = await r.json() as { error?: string }
      if (!r.ok) { setErro(d.error ?? t.connectionError); return }
      setPasso('feito')
    } catch { setErro(t.connectionError) }
    finally { setEnviando(false) }
  }

  function voltarPasso() {
    if (passo === 'data')  { setPasso('servico'); return }
    if (passo === 'hora')  { setPasso('data');    return }
    if (passo === 'dados') { setPasso('hora');    return }
  }

  // ── Estados base ──────────────────────────────────────────────────────────

  if (carregando) {
    return (
      <LayoutBase brand="#0d9488">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
        </div>
      </LayoutBase>
    )
  }

  if (indisponivel || !tenant) {
    return (
      <LayoutBase brand="#0d9488">
        <div className="text-center py-16 px-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
            <Calendar className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium">{t.unavailable}</p>
        </div>
      </LayoutBase>
    )
  }

  const brand    = tenant.primary_color ?? '#0d9488'
  const nicho    = getNicheTerms(tenant.business_type as TenantNiche | null)
  const passoIdx = ['servico','data','hora','dados'].indexOf(passo)

  return (
    <LayoutBase brand={brand}>
      <div className="mx-auto w-full max-w-lg px-4 pb-12 pt-6">

        {/* Seletor de língua */}
        <div className="flex justify-end gap-2 mb-4">
          {(['pt','en','es'] as PortalLang[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded transition-colors ${
                lang === l
                  ? 'text-white rounded-full'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              style={lang === l ? { backgroundColor: brand } : undefined}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Hero — cabeçalho da empresa */}
        <div className="text-center mb-8">
          {tenant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenant.logo_url}
              alt={tenant.name}
              className="h-20 w-20 mx-auto rounded-2xl object-contain bg-white shadow-md border border-slate-100 p-2 mb-4"
            />
          ) : (
            <div
              className="h-20 w-20 mx-auto rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-md mb-4"
              style={{ background: `linear-gradient(135deg, ${brand}, ${brand}cc)` }}
            >
              {tenant.name.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{tenant.name}</h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            {t.secureBooking}
          </p>
        </div>

        {/* Steps — progresso (escondido no estado 'feito') */}
        {passo !== 'feito' && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {([t.stepService, t.stepDateTime, t.stepDetails] as const).map((label, i) => {
              const ativo = i === (passo === 'dados' ? 2 : passo === 'hora' ? 1 : passo === 'data' ? 1 : 0)
              const feito = passoIdx > i
              return (
                <React.Fragment key={label}>
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        feito
                          ? 'text-white'
                          : ativo
                            ? 'text-white ring-4 ring-opacity-25'
                            : 'bg-slate-100 text-slate-400'
                      }`}
                      style={feito || ativo ? { backgroundColor: brand, ...(ativo ? { boxShadow: `0 0 0 4px ${brand}33` } : {}) } : {}}
                    >
                      {feito ? <Check className="w-4 h-4" /> : i + 1}
                    </div>
                    <span className={`text-[10px] font-medium hidden sm:block ${feito || ativo ? 'text-slate-700' : 'text-slate-400'}`}>
                      {label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div className="flex-1 h-px max-w-[48px]" style={{ backgroundColor: passoIdx > i ? brand : '#e2e8f0' }} />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        )}

        {/* Card principal */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">

          {/* Botão Voltar */}
          {passo !== 'servico' && passo !== 'feito' && (
            <button
              onClick={voltarPasso}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 px-5 pt-4 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              {t.back}
            </button>
          )}

          <div className="p-5 sm:p-7">

            {/* ── PASSO: SERVIÇO ─────────────────────────────────────────── */}
            {passo === 'servico' && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">{t.chooseService}</h2>
                <p className="text-sm text-slate-400 mb-5">
                  {nicho.clientSingular !== 'cliente'
                    ? `Para ${nicho.clientPlural}`
                    : t.secureBooking}
                </p>
                {servicos.length === 0 ? (
                  <div className="text-center py-10">
                    <Calendar className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">{t.noServices}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {servicos.map((s) => {
                      const cor = s.color ?? brand
                      const preco = fmtPreco(s.price)
                      return (
                        <button
                          key={s.id}
                          onClick={() => { setServico(s); setPasso('data') }}
                          className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-transparent bg-slate-50 hover:border-current hover:bg-white text-left transition-all group"
                          style={{ '--hover-color': cor } as React.CSSProperties}
                        >
                          {/* Barra de cor */}
                          <span className="flex-shrink-0 w-1.5 h-12 rounded-full" style={{ backgroundColor: cor }} />

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{s.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {s.duration_minutes} {t.min}
                            </p>
                          </div>

                          {preco && (
                            <span className="flex-shrink-0 text-sm font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl">
                              {preco}
                            </span>
                          )}

                          <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── PASSO: DATA ────────────────────────────────────────────── */}
            {passo === 'data' && servico && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">{t.chooseDate}</h2>
                <p className="text-sm text-slate-400 mb-5 flex items-center gap-1.5">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: servico.color ?? brand }}
                  />
                  {servico.name} · {servico.duration_minutes} {t.min}
                </p>

                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    min={hoje}
                    value={data}
                    aria-label={t.chooseDate}
                    onChange={(e) => {
                      const val = e.target.value
                      setData(val)
                      if (val) { carregarSlots(servico.id, val); setPasso('hora') }
                    }}
                    className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-slate-200 text-slate-900 text-base focus:outline-none transition-colors cursor-pointer"
                    style={{ '--tw-ring-color': brand } as React.CSSProperties}
                    onFocus={(e) => { e.target.style.borderColor = brand }}
                    onBlur={(e) => { e.target.style.borderColor = '#e2e8f0' }}
                  />
                </div>
              </div>
            )}

            {/* ── PASSO: HORA ────────────────────────────────────────────── */}
            {passo === 'hora' && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">{t.chooseTime}</h2>
                {data && (
                  <div className="flex items-center justify-between mb-5">
                    <p className="text-sm text-slate-500 capitalize">{fmtData(data)}</p>
                    <button
                      onClick={() => { setPasso('data'); setSlots([]) }}
                      className="text-xs font-medium text-slate-400 hover:text-slate-700 underline"
                    >
                      {t.changeDate}
                    </button>
                  </div>
                )}

                {loadingSlots ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: brand }} />
                    <p className="text-sm text-slate-400">{t.loadingSlots}</p>
                  </div>
                ) : horasDistintas.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-600 mb-1">{t.noSlots}</p>
                    <p className="text-xs text-slate-400">{t.noSlotsHint}</p>
                    <button
                      onClick={() => { setPasso('data'); setSlots([]) }}
                      className="mt-4 text-sm font-medium underline"
                      style={{ color: brand }}
                    >
                      {t.changeDate}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {horasDistintas.map((s) => {
                      const selecionado = slot?.slot_start === s.slot_start
                      return (
                        <button
                          key={s.slot_start}
                          onClick={() => { setSlot(s); setPasso('dados') }}
                          className="py-3 rounded-2xl text-sm font-semibold border-2 transition-all"
                          style={selecionado
                            ? { backgroundColor: brand, borderColor: brand, color: '#fff' }
                            : { borderColor: '#e2e8f0', color: '#475569' }
                          }
                        >
                          {fmtHora(s.slot_start)}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── PASSO: DADOS ───────────────────────────────────────────── */}
            {passo === 'dados' && servico && slot && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-5">{t.yourDetails}</h2>

                {/* Resumo da marcação */}
                <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-4 mb-6">
                  <span
                    className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${servico.color ?? brand}22` }}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: servico.color ?? brand }}
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{servico.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 capitalize">
                      {fmtData(data)} · {fmtHora(slot.slot_start)}
                    </p>
                  </div>
                  {fmtPreco(servico.price) && (
                    <span className="ml-auto text-sm font-bold text-slate-700 flex-shrink-0">
                      {fmtPreco(servico.price)}
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Nome */}
                  <div>
                    <label htmlFor="portal-nome" className="block text-sm font-medium text-slate-700 mb-1.5">
                      {t.nameLabel} <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        id="portal-nome"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder={t.namePlaceholder}
                        autoComplete="name"
                        className="w-full h-12 pl-10 pr-4 rounded-2xl border-2 border-slate-200 text-sm focus:outline-none transition-colors"
                        onFocus={(e) => { e.target.style.borderColor = brand }}
                        onBlur={(e)  => { e.target.style.borderColor = nome.trim().length >= 2 ? brand : '#e2e8f0' }}
                      />
                    </div>
                  </div>

                  {/* Telefone */}
                  <div>
                    <label htmlFor="portal-tel" className="block text-sm font-medium text-slate-700 mb-1.5">
                      {t.phoneLabel}
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        id="portal-tel"
                        value={tel}
                        onChange={(e) => setTel(e.target.value)}
                        type="tel"
                        placeholder={t.phonePlaceholder}
                        autoComplete="tel"
                        className="w-full h-12 pl-10 pr-4 rounded-2xl border-2 border-slate-200 text-sm focus:outline-none transition-colors"
                        onFocus={(e) => { e.target.style.borderColor = brand }}
                        onBlur={(e)  => { e.target.style.borderColor = '#e2e8f0' }}
                      />
                    </div>
                  </div>

                  {erro && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                      <span className="text-red-500 text-lg leading-none mt-0.5">!</span>
                      <p className="text-sm text-red-700">{erro}</p>
                    </div>
                  )}

                  <button
                    onClick={confirmar}
                    disabled={enviando || nome.trim().length < 2}
                    className="w-full h-14 rounded-2xl text-white font-bold text-base disabled:opacity-40 transition-opacity hover:opacity-90 flex items-center justify-center gap-2 shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${brand}, ${brand}cc)`, boxShadow: `0 8px 24px ${brand}44` }}
                  >
                    {enviando
                      ? <><Loader2 className="w-5 h-5 animate-spin" /> {t.sending}</>
                      : <><Check className="w-5 h-5" /> {t.confirmButton}</>
                    }
                  </button>
                </div>
              </div>
            )}

            {/* ── PASSO: FEITO ────────────────────────────────────────────── */}
            {passo === 'feito' && (
              <div className="text-center py-6">
                <div
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-5 shadow-lg"
                  style={{ backgroundColor: `${brand}18`, boxShadow: `0 8px 24px ${brand}30` }}
                >
                  <CheckCircle2 className="w-10 h-10" style={{ color: brand }} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{t.requestSent}</h2>
                <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">{t.successDetail}</p>

                {/* Resumo final */}
                {servico && slot && (
                  <div className="bg-slate-50 rounded-2xl p-5 text-left mb-6 max-w-xs mx-auto">
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: servico.color ?? brand }}
                      />
                      <span className="text-sm font-bold text-slate-900">{servico.name}</span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-500">
                      <p className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="capitalize">{fmtData(data)}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        {fmtHora(slot.slot_start)}
                      </p>
                      {fmtPreco(servico.price) && (
                        <p className="flex items-center gap-2 font-semibold text-slate-700">
                          <span className="w-3.5 inline-block" />
                          {fmtPreco(servico.price)}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-200">
                      <strong>{tenant?.name}</strong> {t.confirmationNote}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => {
                    setPasso('servico'); setServico(null); setData(''); setSlots([])
                    setSlot(null); setNome(''); setTel(''); setErro(null)
                  }}
                  className="text-sm font-semibold underline"
                  style={{ color: brand }}
                >
                  {t.makeAnother}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-400 mt-6">
          {t.bookingPortal} · Powered by{' '}
          <a href="https://www.exodotech.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-500 hover:underline">
            Êxodo Tech
          </a>
        </p>
      </div>
    </LayoutBase>
  )
}

// ── Layout base (fundo com gradiente suave) ───────────────────────────────────

function LayoutBase({ children, brand }: { children: React.ReactNode; brand: string }) {
  return (
    <main
      className="min-h-screen"
      style={{
        background: `radial-gradient(ellipse at 60% 0%, ${brand}12 0%, transparent 60%),
                     linear-gradient(to bottom, #f8fafc, #f1f5f9)`,
        ['--tenant-primary' as string]: brand,
      }}
    >
      {children}
    </main>
  )
}
