'use client'
// Gestão do horário de um recurso: horários de trabalho semanais
// (resource_availability) + folgas/bloqueios pontuais (resource_blocks).
// Sem isto, um recurso novo não tem disponibilidade e não recebe marcações.
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, CalendarOff, Trash2, Plus, Check } from 'lucide-react'
import { Modal }  from '@/components/design-system/Modal/Modal'
import { Button } from '@/components/design-system/Button/Button'
import { Input }  from '@/components/design-system/Input/Input'
import LoadingState from '@/components/design-system/LoadingState/LoadingState'
import {
  listarDisponibilidade, definirDisponibilidade,
  listarBloqueios, criarBloqueio, apagarBloqueio,
  type FranjaHorario, type BloqueioRecurso,
} from '@/services/recurso-horario'

// Ordem de apresentação: segunda → domingo (0=dom..6=sáb na BD)
const DIAS = [
  { dow: 1, label: 'Segunda' }, { dow: 2, label: 'Terça' },   { dow: 3, label: 'Quarta' },
  { dow: 4, label: 'Quinta' },  { dow: 5, label: 'Sexta' },   { dow: 6, label: 'Sábado' },
  { dow: 0, label: 'Domingo' },
]

interface Props {
  isOpen:       boolean
  onClose:      () => void
  resourceId:   string
  resourceNome: string
}

export function RecursoHorarioModal({ isOpen, onClose, resourceId, resourceNome }: Props) {
  const [aba, setAba] = useState<'horario' | 'folgas'>('horario')

  const { data: disponibilidade, isLoading: loadingDisp } = useQuery({
    queryKey: ['recurso-disponibilidade', resourceId],
    queryFn:  () => listarDisponibilidade(resourceId),
    enabled:  isOpen,
  })
  const { data: bloqueios, isLoading: loadingBloq } = useQuery({
    queryKey: ['recurso-bloqueios', resourceId],
    queryFn:  () => listarBloqueios(resourceId),
    enabled:  isOpen,
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Horário — ${resourceNome}`} size="lg">
      {/* Abas */}
      <div className="flex gap-1 p-1 rounded-lg bg-slate-100 mb-4 w-fit">
        {([
          { v: 'horario', l: 'Horário de trabalho', icon: Clock },
          { v: 'folgas',  l: 'Folgas',              icon: CalendarOff },
        ] as const).map((o) => {
          const Icon = o.icon
          return (
            <button
              key={o.v}
              onClick={() => setAba(o.v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                aba === o.v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" /> {o.l}
            </button>
          )
        })}
      </div>

      {aba === 'horario' ? (
        loadingDisp ? <LoadingState message="A carregar horário..." /> : (
          <EditorHorario key={resourceId} resourceId={resourceId} inicial={disponibilidade ?? []} onClose={onClose} />
        )
      ) : (
        loadingBloq ? <LoadingState message="A carregar folgas..." /> : (
          <SeccaoFolgas resourceId={resourceId} bloqueios={bloqueios ?? []} />
        )
      )}
    </Modal>
  )
}

// ── Editor de horário semanal ────────────────────────────────────────────────
interface LinhaDia { ativo: boolean; inicio: string; fim: string }

function EditorHorario({ resourceId, inicial, onClose }: { resourceId: string; inicial: FranjaHorario[]; onClose: () => void }) {
  const qc = useQueryClient()
  // Estado inicial a partir das franjas existentes (uma por dia no editor).
  const [dias, setDias] = useState<Record<number, LinhaDia>>(() => {
    const base: Record<number, LinhaDia> = {}
    for (const d of DIAS) {
      const f = inicial.find((x) => x.day_of_week === d.dow)
      base[d.dow] = f
        ? { ativo: true, inicio: f.start_time, fim: f.end_time }
        : { ativo: false, inicio: '09:00', fim: '18:00' }
    }
    return base
  })
  const [erro, setErro] = useState<string | null>(null)

  const guardar = useMutation({
    mutationFn: () => {
      const franjas: FranjaHorario[] = []
      for (const d of DIAS) {
        const l = dias[d.dow]
        if (l.ativo) {
          if (l.fim <= l.inicio) throw new Error(`${d.label}: a hora de fim tem de ser depois do início.`)
          franjas.push({ day_of_week: d.dow, start_time: l.inicio, end_time: l.fim })
        }
      }
      return definirDisponibilidade(resourceId, franjas)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['recurso-disponibilidade', resourceId] })
      onClose()
    },
    onError: (e) => setErro((e as Error).message),
  })

  function set(dow: number, patch: Partial<LinhaDia>) {
    setDias((prev) => ({ ...prev, [dow]: { ...prev[dow], ...patch } }))
  }

  // Copiar o horário de segunda para os dias úteis (atalho comum)
  function aplicarSegATodos() {
    const seg = dias[1]
    setDias((prev) => {
      const next = { ...prev }
      for (const dow of [2, 3, 4, 5]) next[dow] = { ...seg }
      return next
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Defina os dias e horas em que este recurso atende. Fora destes horários não há marcações.
      </p>

      <div className="space-y-1.5">
        {DIAS.map((d) => {
          const l = dias[d.dow]
          return (
            <div key={d.dow} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${l.ativo ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50/60'}`}>
              <label className="flex items-center gap-2 w-28 flex-shrink-0 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded accent-[color:var(--tenant-primary)]" checked={l.ativo} onChange={(e) => set(d.dow, { ativo: e.target.checked })} />
                <span className={`text-sm font-medium ${l.ativo ? 'text-slate-800' : 'text-slate-400'}`}>{d.label}</span>
              </label>
              {l.ativo ? (
                <div className="flex items-center gap-2">
                  <input type="time" value={l.inicio} onChange={(e) => set(d.dow, { inicio: e.target.value })} className="h-9 px-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--tenant-primary)]" />
                  <span className="text-slate-400 text-sm">às</span>
                  <input type="time" value={l.fim} onChange={(e) => set(d.dow, { fim: e.target.value })} className="h-9 px-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--tenant-primary)]" />
                </div>
              ) : (
                <span className="text-sm text-slate-400">Fechado</span>
              )}
            </div>
          )
        })}
      </div>

      <button onClick={aplicarSegATodos} className="text-xs text-[color:var(--tenant-primary)] hover:underline">
        Aplicar o horário de segunda a todos os dias úteis
      </button>

      {erro && <div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-sm text-red-700">{erro}</p></div>}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose} disabled={guardar.isPending}>Cancelar</Button>
        <Button onClick={() => { setErro(null); guardar.mutate() }} isLoading={guardar.isPending} disabled={guardar.isPending} className="gap-1.5">
          <Check className="w-4 h-4" /> Guardar horário
        </Button>
      </div>
    </div>
  )
}

// ── Secção de folgas / bloqueios ─────────────────────────────────────────────
function SeccaoFolgas({ resourceId, bloqueios }: { resourceId: string; bloqueios: BloqueioRecurso[] }) {
  const qc = useQueryClient()
  const [data, setData]   = useState('')
  const [inicio, setInicio] = useState('09:00')
  const [fim, setFim]     = useState('18:00')
  const [motivo, setMotivo] = useState('')
  const [erro, setErro]   = useState<string | null>(null)

  function invalidar() { void qc.invalidateQueries({ queryKey: ['recurso-bloqueios', resourceId] }) }

  const criar = useMutation({
    mutationFn: () => {
      if (!data) throw new Error('Escolha a data da folga.')
      if (fim <= inicio) throw new Error('A hora de fim tem de ser depois do início.')
      const start_at = new Date(`${data}T${inicio}:00`).toISOString()
      const end_at   = new Date(`${data}T${fim}:00`).toISOString()
      return criarBloqueio(resourceId, { start_at, end_at, reason: motivo })
    },
    onSuccess: () => { invalidar(); setData(''); setMotivo(''); setErro(null) },
    onError:   (e) => setErro((e as Error).message),
  })
  const remover = useMutation({
    mutationFn: (id: string) => apagarBloqueio(id),
    onSuccess:  invalidar,
  })

  function fmt(b: BloqueioRecurso) {
    const i = new Date(b.start_at), f = new Date(b.end_at)
    const dia = i.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
    const hi = i.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    const hf = f.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    return `${dia} · ${hi}–${hf}`
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">Marque períodos em que o recurso NÃO está disponível (férias, folga, formação, almoço...).</p>

      {/* Formulário de nova folga */}
      <div className="bg-slate-50/60 border border-slate-100 rounded-xl p-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Data</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="w-full h-9 px-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--tenant-primary)]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Início</label>
            <input type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} className="w-full h-9 px-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--tenant-primary)]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fim</label>
            <input type="time" value={fim} onChange={(e) => setFim(e.target.value)} className="w-full h-9 px-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--tenant-primary)]" />
          </div>
        </div>
        <Input label="Motivo (opcional)" placeholder="Férias, formação, almoço..." value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        {erro && <p className="text-xs text-red-600">{erro}</p>}
        <Button size="sm" onClick={() => criar.mutate()} isLoading={criar.isPending} disabled={criar.isPending} className="gap-1.5">
          <Plus className="w-4 h-4" /> Adicionar folga
        </Button>
      </div>

      {/* Lista de folgas */}
      {bloqueios.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">Sem folgas registadas.</p>
      ) : (
        <div className="space-y-1.5">
          {bloqueios.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-100 bg-white">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">{fmt(b)}</p>
                {b.reason && <p className="text-xs text-slate-500 truncate">{b.reason}</p>}
              </div>
              <button onClick={() => remover.mutate(b.id)} disabled={remover.isPending} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50" title="Remover">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default RecursoHorarioModal
