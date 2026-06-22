'use client'
// Modal de cliente — cria um novo OU edita um existente (modo dual).
// Quando recebe `cliente`, entra em modo edição.
import React, { useEffect, useState } from 'react'
import { UserPlus, Save } from 'lucide-react'
import { useFormWithZod }   from '@/hooks/useFormWithZod'
import { useCriarCliente, useAtualizarCliente } from '@/hooks/useClientes'
import { criarClienteSchema, type CriarClienteInput } from '@/lib/validators/client'
import { parseTags } from '@/lib/clientes/insights'
import { MARKETING_CONSENT_TEXT, OPERATIONAL_COMMS_NOTE } from '@/lib/consent'
import { useAuth } from '@/providers/AuthProvider'
import { useNicheTerms } from '@/hooks/useNicheTerms'
import { capitalize } from '@/lib/niche-templates'
import { getTaxIdPlaceholder } from '@/lib/i18n/tax-id'
import { Modal }   from '@/components/design-system/Modal/Modal'
import { Button }  from '@/components/design-system/Button/Button'
import { Input }   from '@/components/design-system/Input/Input'

// Forma mínima do cliente para edição (vinda de buscarClientePorId)
export interface ClienteEditavel {
  id: string
  full_name: string
  phone?: string | null
  email?: string | null
  nif?: string | null
  birth_date?: string | null
  notes?: string | null
  tags?: string[] | null
  marketing_consent?: boolean | null
}

interface NovoClienteModalProps {
  isOpen:   boolean
  onClose:  () => void
  cliente?: ClienteEditavel | null   // presente = modo edição
  onSuccess?: () => void
}

export function NovoClienteModal({ isOpen, onClose, cliente, onSuccess }: NovoClienteModalProps) {
  const modoEdicao  = !!cliente
  const criar       = useCriarCliente()
  const atualizar   = useAtualizarCliente()

  // Campo fiscal conforme o país do tenant: PT → NIF; BR → CPF/CNPJ.
  // Regra: nunca mostrar CPF/CNPJ a Portugal nem NIF ao Brasil.
  const { tenant } = useAuth()
  const terms = useNicheTerms()
  const isBR = tenant?.country === 'BR'
  const fiscalLabel       = isBR ? 'CPF / CNPJ' : 'NIF'
  const fiscalPlaceholder = getTaxIdPlaceholder(isBR ? 'cpf' : 'nif')
  const phonePlaceholder  = isBR ? '+55 11 91234-5678' : '+351 912 345 678'

  // Etiquetas como texto livre ("vip, frequente"). useState inicializado a partir
  // do cliente — o componente é remontado pelo `key` no pai ao trocar de cliente,
  // por isso o inicializador corre com o valor certo (sem setState em efeito).
  const [tagsText, setTagsText] = useState(() => (cliente?.tags ?? []).join(', '))

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useFormWithZod(criarClienteSchema, {
    defaultValues: { marketing_consent: false },
  })

  useEffect(() => {
    if (!isOpen) return
    if (cliente) {
      reset({
        full_name:         cliente.full_name,
        phone:             cliente.phone ?? '',
        email:             cliente.email ?? '',
        nif:               cliente.nif ?? '',
        birth_date:        cliente.birth_date ?? '',
        notes:             cliente.notes ?? '',
        marketing_consent: cliente.marketing_consent ?? false,
      })
    } else {
      reset({ marketing_consent: false })
    }
  }, [isOpen, cliente, reset])

  async function onSubmit(data: CriarClienteInput) {
    const comTags: CriarClienteInput = { ...data, tags: parseTags(tagsText) }
    if (modoEdicao && cliente) {
      await atualizar.mutateAsync({ id: cliente.id, input: comTags })
    } else {
      await criar.mutateAsync(comTags)
    }
    reset()
    onSuccess?.()
    onClose()
  }

  function handleClose() {
    reset()
    criar.reset()
    atualizar.reset()
    onClose()
  }

  const erroMut = (modoEdicao ? atualizar.error : criar.error) as Error | null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={modoEdicao ? `Editar ${capitalize(terms.clientSingular)}` : terms.clientNew}
      size="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={handleClose} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" form="form-cliente" size="sm" isLoading={isSubmitting} disabled={isSubmitting}>
            {modoEdicao ? <Save className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            Guardar
          </Button>
        </>
      }
    >
      <form id="form-cliente" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input label="Nome completo" required placeholder="Maria Oliveira" error={errors.full_name?.message} {...register('full_name')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Telefone" type="tel" placeholder={phonePlaceholder} error={errors.phone?.message} {...register('phone')} />
          <Input label="Data de nascimento" type="date" error={errors.birth_date?.message} {...register('birth_date')} />
        </div>
        <Input label="E-mail" type="email" placeholder="cliente@email.com" error={errors.email?.message} {...register('email')} />
        <Input label={fiscalLabel} placeholder={fiscalPlaceholder} error={errors.nif?.message} {...register('nif')} />

        {/* Etiquetas — segmentação simples em linguagem do dia-a-dia */}
        <div>
          <label htmlFor="cliente-tags" className="block text-sm font-medium text-slate-700 mb-1">Etiquetas</label>
          <input
            id="cliente-tags"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="vip, frequente, indicação"
            className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--tenant-primary)] focus:border-transparent"
          />
          <p className="mt-1 text-xs text-slate-400">Separe por vírgulas. Servem para organizar e filtrar (ex: VIP, frequente).</p>
        </div>

        {/* Notas internas */}
        <div>
          <label htmlFor="cliente-notes" className="block text-sm font-medium text-slate-700 mb-1">Notas internas</label>
          <textarea
            id="cliente-notes"
            rows={2}
            placeholder="Preferências, alergias, observações... (só a sua equipa vê)"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--tenant-primary)] focus:border-transparent"
            {...register('notes')}
          />
          {errors.notes && <p className="mt-1 text-xs text-red-600">{errors.notes.message}</p>}
        </div>

        {/* Consentimento de MARKETING (RGPD/LGPD) — opcional, nunca bloqueia.
            Alterar aqui grava um novo registo imutável em legal_consents (trigger). */}
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
          <div className="flex items-start gap-3">
            <input
              id="marketing_consent"
              type="checkbox"
              className="w-4 h-4 mt-0.5 rounded border-gray-300 text-[color:var(--tenant-primary)] focus:ring-[color:var(--tenant-primary)]"
              {...register('marketing_consent')}
            />
            <label htmlFor="marketing_consent" className="text-sm text-gray-700 cursor-pointer">
              {MARKETING_CONSENT_TEXT}
            </label>
          </div>
          <p className="text-xs text-gray-500 pl-7">{OPERATIONAL_COMMS_NOTE}</p>
        </div>

        {erroMut && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{erroMut.message}</p>
          </div>
        )}
      </form>
    </Modal>
  )
}
