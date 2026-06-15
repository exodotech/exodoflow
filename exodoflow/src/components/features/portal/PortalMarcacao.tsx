'use client'
// Portal público de marcação (cliente marca sozinho). Fala só com /api/public/*.
// Fluxo: serviço → data → horário → nome/telefone → confirmação.
import React, { useEffect, useState, useCallback } from 'react'
import { Calendar, Clock, Check, ChevronLeft, Loader2 } from 'lucide-react'

interface Tenant { id: string; name: string; primary_color: string | null; logo_url: string | null }
interface Servico { id: string; name: string; duration_minutes: number; price: number | null; color: string | null }
interface Slot { slot_start: string; slot_end: string; resource_id: string }

type Passo = 'servico' | 'data' | 'hora' | 'dados' | 'feito'

export function PortalMarcacao({ slug }: { slug: string }) {
  const [carregando, setCarregando] = useState(true)
  const [indisponivel, setIndisponivel] = useState(false)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [servicos, setServicos] = useState<Servico[]>([])

  const [passo, setPasso]   = useState<Passo>('servico')
  const [servico, setServico] = useState<Servico | null>(null)
  const [data, setData]     = useState('')
  const [slots, setSlots]   = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slot, setSlot]     = useState<Slot | null>(null)
  const [nome, setNome]     = useState('')
  const [tel, setTel]       = useState('')
  const [erro, setErro]     = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  // Carregar tenant + serviços
  useEffect(() => {
    fetch(`/api/public/${slug}`)
      .then(async (r) => {
        if (!r.ok) { setIndisponivel(true); return }
        const d = await r.json()
        setTenant(d.tenant); setServicos(d.services ?? [])
      })
      .catch(() => setIndisponivel(true))
      .finally(() => setCarregando(false))
  }, [slug])

  const hoje = new Date().toISOString().slice(0, 10)

  const carregarSlots = useCallback(async (svcId: string, dia: string) => {
    setLoadingSlots(true); setSlots([]); setSlot(null); setErro(null)
    try {
      const r = await fetch(`/api/public/${slug}/slots?service_id=${svcId}&date=${dia}`)
      const d = await r.json()
      setSlots(r.ok ? (d.slots ?? []) : [])
    } catch { setSlots([]) }
    finally { setLoadingSlots(false) }
  }, [slug])

  // Horários distintos (o portal escolhe o 1º profissional livre nessa hora)
  const horasDistintas = Array.from(
    new Map(slots.map((s) => [s.slot_start, s])).values(),
  ).sort((a, b) => a.slot_start.localeCompare(b.slot_start))

  function fmtHora(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  }
  function fmtData(dia: string) {
    return new Date(dia + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  async function confirmar() {
    if (!servico || !slot) return
    setEnviando(true); setErro(null)
    try {
      const r = await fetch(`/api/public/${slug}/book`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: servico.id, resource_id: slot.resource_id,
          start_at: slot.slot_start, end_at: slot.slot_end, name: nome, phone: tel || undefined,
        }),
      })
      const d = await r.json()
      if (!r.ok) { setErro(d.error ?? 'Erro ao marcar.'); return }
      setPasso('feito')
    } catch { setErro('Erro de ligação. Tente novamente.') }
    finally { setEnviando(false) }
  }

  // ── Estados base ────────────────────────────────────────────────────────────
  if (carregando) {
    return <Centro><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></Centro>
  }
  if (indisponivel || !tenant) {
    return <Centro><p className="text-slate-500 text-sm text-center">Este portal de marcações não está disponível.</p></Centro>
  }

  const brand = tenant.primary_color ?? '#0d9488'

  return (
    <main className="min-h-screen app-bg py-8 px-4" style={{ ['--tenant-primary' as string]: brand }}>
      <div className="mx-auto w-full max-w-md">
        {/* Cabeçalho do tenant */}
        <div className="flex items-center gap-3 mb-6">
          {tenant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.logo_url} alt={tenant.name} className="h-11 w-11 rounded-xl object-contain bg-white border border-slate-200 p-1" />
          ) : (
            <span className="h-11 w-11 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: brand }}>
              {tenant.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">{tenant.name}</h1>
            <p className="text-xs text-slate-500">Marcação online</p>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-5">
          {passo === 'feito' ? (
            <div className="text-center py-6">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mb-3"><Check className="w-7 h-7" /></span>
              <h2 className="text-lg font-bold text-slate-900">Pedido enviado!</h2>
              <p className="text-sm text-slate-500 mt-1">
                A sua marcação de <strong>{servico?.name}</strong> em {data && fmtData(data)} às {slot && fmtHora(slot.slot_start)} foi registada.
                A {tenant.name} vai confirmar em breve.
              </p>
            </div>
          ) : (
            <>
              {/* Voltar */}
              {passo !== 'servico' && (
                <button onClick={() => setPasso(passo === 'data' ? 'servico' : passo === 'hora' ? 'data' : 'hora')}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mb-3">
                  <ChevronLeft className="w-4 h-4" /> Voltar
                </button>
              )}

              {/* Passo: serviço */}
              {passo === 'servico' && (
                <div className="space-y-2">
                  <h2 className="text-sm font-semibold text-slate-800 mb-1">Escolha o serviço</h2>
                  {servicos.length === 0 && <p className="text-sm text-slate-400">Sem serviços disponíveis.</p>}
                  {servicos.map((s) => (
                    <button key={s.id} onClick={() => { setServico(s); setPasso('data') }}
                      className="w-full flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 hover:border-[color:var(--tenant-primary)] hover:bg-slate-50 text-left transition-colors">
                      <span>
                        <span className="block text-sm font-medium text-slate-900">{s.name}</span>
                        <span className="block text-xs text-slate-500">{s.duration_minutes} min</span>
                      </span>
                      {s.price != null && <span className="text-sm font-semibold text-slate-700">€{Number(s.price).toFixed(2)}</span>}
                    </button>
                  ))}
                </div>
              )}

              {/* Passo: data */}
              {passo === 'data' && servico && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Escolha o dia</h2>
                  <input type="date" min={hoje} value={data}
                    onChange={(e) => { setData(e.target.value); if (e.target.value) { carregarSlots(servico.id, e.target.value); setPasso('hora') } }}
                    className="w-full h-12 px-3 rounded-xl border border-slate-200 text-base focus:outline-none focus:ring-2 focus:ring-[color:var(--tenant-primary)]" />
                </div>
              )}

              {/* Passo: hora */}
              {passo === 'hora' && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Escolha a hora — {data && fmtData(data)}</h2>
                  {loadingSlots ? (
                    <p className="text-sm text-slate-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> A procurar horários...</p>
                  ) : horasDistintas.length === 0 ? (
                    <p className="text-sm text-slate-400">Sem horários disponíveis neste dia. Escolha outra data.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {horasDistintas.map((s) => (
                        <button key={s.slot_start} onClick={() => { setSlot(s); setPasso('dados') }}
                          className="py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:border-[color:var(--tenant-primary)] hover:bg-slate-50 transition-colors">
                          {fmtHora(s.slot_start)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Passo: dados */}
              {passo === 'dados' && servico && slot && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-slate-800">Os seus dados</h2>
                  <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2.5">
                    {servico.name} · {data && fmtData(data)} · {fmtHora(slot.slot_start)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
                    <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="O seu nome"
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--tenant-primary)]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Telefone (opcional)</label>
                    <input value={tel} onChange={(e) => setTel(e.target.value)} type="tel" placeholder="+351 ..."
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--tenant-primary)]" />
                  </div>
                  {erro && <p className="text-sm text-red-600">{erro}</p>}
                  <button onClick={confirmar} disabled={enviando || nome.trim().length < 2}
                    className="w-full h-12 rounded-xl text-white font-semibold disabled:opacity-50 transition-opacity hover:opacity-90 inline-flex items-center justify-center gap-2"
                    style={{ background: brand }}>
                    {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Confirmar marcação
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-4">
          Powered by <a href="https://www.exodotech.com" target="_blank" rel="noopener noreferrer" className="font-medium text-slate-500 hover:underline">Êxodo Tech</a>
        </p>
      </div>
    </main>
  )
}

function Centro({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen app-bg flex items-center justify-center p-6">{children}</main>
}
