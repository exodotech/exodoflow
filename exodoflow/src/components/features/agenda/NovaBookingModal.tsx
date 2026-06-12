'use client'
import React, { useState } from 'react'
import { ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { Modal }              from '@/components/design-system/Modal/Modal'
import { Button }             from '@/components/design-system/Button/Button'
import { useClientes }        from '@/hooks/useClientes'
import { useServicos }        from '@/hooks/useServicos'
import { useRecursos }        from '@/hooks/useRecursos'
import { useCriarBooking }    from '@/hooks/useBookings'
import { useDisponibilidade } from '@/hooks/useDisponibilidade'
import { useAuth }            from '@/providers/AuthProvider'
import { StepClienteServico } from './steps/StepClienteServico'
import { StepDataRecurso }    from './steps/StepDataRecurso'
import { StepHorarios }       from './steps/StepHorarios'
import { StepConfirmacao }    from './steps/StepConfirmacao'
import { ClienteRapidoModal } from '@/components/features/clientes/ClienteRapidoModal'
import type { SlotDisponivel } from '@/services/disponibilidade'

interface NovaBookingModalProps {
  isOpen:  boolean
  onClose: () => void
}

type Step = 1 | 2 | 3 | 4

interface Selecao {
  client_id:   string
  service_id:  string
  date:        string          // 'YYYY-MM-DD'
  resource_id: string
  slot:        SlotDisponivel | null
  notes:       string
}

const STEP_LABELS = ['Cliente e Serviço', 'Data e Recurso', 'Horário disponível', 'Confirmar']

const SEL_INICIAL: Selecao = {
  client_id: '', service_id: '', date: '', resource_id: '', slot: null, notes: '',
}

export function NovaBookingModal({ isOpen, onClose }: NovaBookingModalProps) {
  const { tenant }   = useAuth()
  const criarBooking = useCriarBooking()

  const { data: clientes = [] }  = useClientes()
  const { data: servicos = [] }  = useServicos()
  const { data: recursos = [] }  = useRecursos()

  const [step, setStep]   = useState<Step>(1)
  const [sel, setSel]     = useState<Selecao>(SEL_INICIAL)
  const [erro, setErro]   = useState<string | null>(null)
  const [rapidoAberto, setRapidoAberto] = useState(false)

  const settings     = tenant?.settings as { timezone?: string; slot_interval_minutes?: number } | null
  const timezone     = settings?.timezone     ?? 'Europe/Lisbon'
  const slotInterval = settings?.slot_interval_minutes ?? 15
  const tenantId     = tenant?.id ?? ''

  const selectedService  = servicos.find((s) => s.id === sel.service_id)
  const selectedClient   = clientes.find((c) => c.id === sel.client_id)
  const selectedResource = recursos.find((r) => r.id === sel.resource_id)

  // Slots só são pedidos quando step 3 está activo e todos os parâmetros existem
  const slotsParams =
    sel.resource_id && sel.service_id && sel.date && tenantId
      ? {
          tenant_id:             tenantId,
          resource_ids:          [sel.resource_id],
          service_id:            sel.service_id,
          start_date:            sel.date,
          end_date:              sel.date,
          slot_interval_minutes: slotInterval,
        }
      : null

  const { data: slots = [], isLoading: loadingSlots, error: erroSlots } =
    useDisponibilidade(step === 3 ? slotsParams : null)

  function formatarHora(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-PT', {
      timeZone: timezone, hour: '2-digit', minute: '2-digit',
    })
  }

  function reset() {
    setStep(1)
    setSel(SEL_INICIAL)
    setErro(null)
    criarBooking.reset()
  }

  function handleClose() { reset(); onClose() }

  function avancar() {
    setErro(null)
    if (step === 1) {
      if (!sel.client_id)  { setErro('Seleccione um cliente');  return }
      if (!sel.service_id) { setErro('Seleccione um serviço'); return }
    }
    if (step === 2) {
      if (!sel.date)        { setErro('Seleccione uma data');    return }
      if (!sel.resource_id) { setErro('Seleccione um recurso'); return }
    }
    if (step === 3) {
      if (!sel.slot) { setErro('Seleccione um horário disponível'); return }
    }
    setStep((s) => (Math.min(4, s + 1) as Step))
  }

  function recuar() { setErro(null); setStep((s) => (Math.max(1, s - 1) as Step)) }

  async function handleConfirmar() {
    if (!sel.slot) return
    setErro(null)
    try {
      await criarBooking.mutateAsync({
        client_id:    sel.client_id,
        service_id:   sel.service_id,
        start_at:     sel.slot.slot_start,
        end_at:       sel.slot.slot_end,
        resource_ids: [sel.slot.resource_id],
        notes:        sel.notes || undefined,
      })
      reset()
      onClose()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar marcação')
    }
  }

  const isLastStep  = step === 4
  const isFirstStep = step === 1
  const isPending   = criarBooking.isPending

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Nova Marcação"
      size="md"
      footer={
        <div className="flex w-full gap-2">
          <Button
            variant="outline" size="sm"
            onClick={isFirstStep ? handleClose : recuar}
            disabled={isPending}
            className="flex items-center gap-1"
          >
            {!isFirstStep && <ChevronLeft className="w-4 h-4" />}
            {isFirstStep ? 'Cancelar' : 'Anterior'}
          </Button>
          <div className="flex-1" />
          {isLastStep ? (
            <Button size="sm" onClick={handleConfirmar} isLoading={isPending} disabled={isPending} className="flex items-center gap-1">
              <Check className="w-4 h-4" />
              Confirmar Marcação
            </Button>
          ) : (
            <Button size="sm" onClick={avancar} className="flex items-center gap-1">
              Seguinte
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      }
    >
      {/* Indicador de passo */}
      <div className="flex items-center gap-1 mb-6">
        {([1, 2, 3, 4] as Step[]).map((n) => (
          <React.Fragment key={n}>
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${
              n < step  ? 'bg-[color:var(--tenant-primary)] text-white'
              : n === step ? 'bg-[color:var(--tenant-primary)] text-white ring-2 ring-gray-200'
              : 'bg-gray-200 text-gray-500'
            }`}>
              {n < step ? <Check className="w-3.5 h-3.5" /> : n}
            </div>
            {n < 4 && <div className={`flex-1 h-px ${n < step ? 'bg-[color:var(--tenant-primary)]' : 'bg-gray-200'}`} />}
          </React.Fragment>
        ))}
      </div>
      <p className="text-xs text-gray-500 text-center mb-4">
        Passo {step} de 4 — {STEP_LABELS[step - 1]}
      </p>

      {/* Conteúdo do passo activo */}
      {step === 1 && (
        <StepClienteServico
          clienteId={sel.client_id} servicoId={sel.service_id}
          clientes={clientes} servicos={servicos}
          onChange={(u) => setSel((s) => ({ ...s, ...u }))}
          onCriarVisitante={() => setRapidoAberto(true)}
        />
      )}
      {step === 2 && (
        <StepDataRecurso
          date={sel.date} recursoId={sel.resource_id}
          recursos={recursos} servico={selectedService}
          onChange={(u) => setSel((s) => ({ ...s, ...u }))}
        />
      )}
      {step === 3 && (
        <StepHorarios
          pronto={!!slotsParams}
          loadingSlots={loadingSlots}
          erroSlots={erroSlots as Error | null}
          slots={slots}
          slotSelecionado={sel.slot}
          dataSelecionada={sel.date}
          nomeRecurso={selectedResource?.name}
          formatarHora={formatarHora}
          onSelecionarSlot={(slot) => setSel((s) => ({ ...s, slot }))}
          onLimparErro={() => setErro(null)}
        />
      )}
      {step === 4 && (
        <StepConfirmacao
          cliente={selectedClient} servico={selectedService} recurso={selectedResource}
          date={sel.date} slot={sel.slot} notes={sel.notes}
          formatarHora={formatarHora}
          onNotesChange={(notes) => setSel((s) => ({ ...s, notes }))}
        />
      )}

      {/* Erro de validação ou mutação */}
      {erro && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{erro}</p>
        </div>
      )}

      {/* Cliente rápido (visitante) dentro do fluxo de marcação — selecciona-o logo */}
      <ClienteRapidoModal
        isOpen={rapidoAberto}
        onClose={() => setRapidoAberto(false)}
        onCriado={(c) => setSel((s) => ({ ...s, client_id: c.id }))}
      />
    </Modal>
  )
}

export default NovaBookingModal
