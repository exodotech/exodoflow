'use client'
// Detalhe operacional do cliente: dados, consentimentos (trilho imutável) e
// marcações. Acções de editar / apagar são delegadas ao componente pai para
// evitar modais aninhados.
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Pencil, Trash2, Calendar, UserCheck, MessageSquare } from 'lucide-react'
import { Modal }  from '@/components/design-system/Modal/Modal'
import { Button } from '@/components/design-system/Button/Button'
import { Badge }  from '@/components/design-system/Badge/Badge'
import { buscarClientePorId, listarConsentimentosCliente } from '@/services/clients'
import { listarBookingsPorCliente } from '@/services/bookings'
import { useConverterVisitante } from '@/hooks/useClientes'
import { useAuth } from '@/providers/AuthProvider'
import type { ClienteEditavel } from './NovoClienteModal'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente', confirmed: 'Confirmada', in_progress: 'Em curso',
  completed: 'Concluída', cancelled: 'Cancelada', no_show: 'Falta',
}

interface Props {
  isOpen:    boolean
  clientId:  string | null
  onClose:   () => void
  onEditar:  (c: ClienteEditavel) => void
  onApagar:  (c: ClienteEditavel) => void
}

export function ClienteDetalheModal({ isOpen, clientId, onClose, onEditar, onApagar }: Props) {
  const ativo = isOpen && !!clientId
  const converter = useConverterVisitante()
  // Label fiscal conforme o país do tenant (PT → NIF; BR → CPF/CNPJ)
  const { tenant } = useAuth()
  const fiscalLabel = tenant?.country === 'BR' ? 'CPF / CNPJ' : 'NIF'

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente', clientId],
    queryFn:  () => buscarClientePorId(clientId as string),
    enabled:  ativo,
  })
  const { data: consentimentos = [] } = useQuery({
    queryKey: ['cliente-consentimentos', clientId],
    queryFn:  () => listarConsentimentosCliente(clientId as string),
    enabled:  ativo,
  })
  const { data: marcacoes = [] } = useQuery({
    queryKey: ['cliente-marcacoes', clientId],
    queryFn:  () => listarBookingsPorCliente(clientId as string),
    enabled:  ativo,
  })

  const editavel: ClienteEditavel | null = cliente
    ? { id: cliente.id, full_name: cliente.full_name, phone: cliente.phone, email: cliente.email, nif: cliente.nif, marketing_consent: cliente.marketing_consent }
    : null

  const isGuest = cliente?.is_guest === true

  // Converter visitante → permanente e, em seguida, abrir a edição para completar
  // os dados (telefone, e-mail, NIF, consentimento, notas).
  async function handleConverter() {
    if (!editavel) return
    try {
      await converter.mutateAsync(editavel.id)
      onEditar(editavel)
    } catch { /* erro mostrado no corpo do modal */ }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={cliente?.full_name ?? 'Cliente'}
      size="lg"
      footer={
        editavel ? (
          <div className="flex w-full gap-2">
            <Button variant="danger" size="sm" onClick={() => onApagar(editavel)} className="flex items-center gap-1">
              <Trash2 className="w-4 h-4" /> Apagar
            </Button>
            <div className="flex-1" />
            {isGuest && (
              <Button
                variant="outline" size="sm"
                onClick={handleConverter}
                isLoading={converter.isPending}
                className="flex items-center gap-1"
              >
                <UserCheck className="w-4 h-4" /> Converter em cliente
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
            <Button size="sm" onClick={() => onEditar(editavel)} className="flex items-center gap-1">
              <Pencil className="w-4 h-4" /> Editar
            </Button>
          </div>
        ) : undefined
      }
    >
      {isLoading || !cliente ? (
        <p className="text-sm text-gray-500 py-8 text-center">A carregar...</p>
      ) : (
        <div className="space-y-6">
          {/* Tipo de cliente */}
          <div className="flex items-center gap-2">
            <Badge variant={isGuest ? 'warning' : 'primary'}>
              {isGuest ? 'Visitante' : 'Cliente'}
            </Badge>
            {isGuest && (
              <span className="text-xs text-gray-500">
                Cadastro mínimo — pode converter em cliente permanente.
              </span>
            )}
          </div>

          {/* Dados */}
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Telefone" valor={cliente.phone ?? '—'} />
            <Campo label="E-mail" valor={cliente.email ?? '—'} />
            <Campo label={fiscalLabel} valor={cliente.nif ?? '—'} />
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Marketing</p>
              <Badge variant={cliente.marketing_consent ? 'success' : 'default'}>
                {cliente.marketing_consent ? 'Sim' : 'Não'}
              </Badge>
            </div>
          </div>

          {converter.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{(converter.error as Error).message}</p>
            </div>
          )}

          {/* Trilho de consentimento (imutável, RGPD) */}
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-2">Histórico de consentimento</p>
            {consentimentos.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Sem registos.</p>
            ) : (
              <div className="space-y-1.5">
                {consentimentos.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-md px-3 py-2">
                    <span className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${c.consented ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {c.consented ? 'Aceitou marketing' : 'Recusou/revogou marketing'}
                    </span>
                    <span className="text-gray-400">
                      {new Date(c.consented_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {' · '}{c.consent_version}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Marcações */}
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-2">Marcações ({marcacoes.length})</p>
            {marcacoes.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Nenhuma marcação.</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {marcacoes.map((m) => {
                  const servico = m.service as { name?: string; color?: string } | null
                  return (
                    <div key={m.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-md px-3 py-2">
                      <span className="flex items-center gap-2 min-w-0">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{servico?.name ?? 'Serviço'}</span>
                      </span>
                      <span className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-gray-500">
                          {new Date(m.start_at).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        </span>
                        <Badge variant={m.status === 'cancelled' || m.status === 'no_show' ? 'default' : 'success'}>
                          {STATUS_LABEL[m.status] ?? m.status}
                        </Badge>
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Notas internas */}
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-2">Notas internas</p>
            {cliente.notes ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-md px-3 py-2">{cliente.notes}</p>
            ) : (
              <p className="text-xs text-gray-400 italic">Sem notas. Use Editar para adicionar.</p>
            )}
          </div>

          {/* Comunicação — WhatsApp real ainda não está activo nesta fase */}
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-2">Comunicação</p>
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-md px-3 py-3">
              <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>Sem mensagens. O WhatsApp ainda não está ativo nesta fase — o histórico aparecerá aqui quando for ligado.</span>
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <Campo
              label="Cadastrado em"
              valor={new Date(cliente.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
            />
            {cliente.guest_converted_at && (
              <Campo
                label="Convertido em"
                valor={new Date(cliente.guest_converted_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
              />
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-gray-900">{valor}</p>
    </div>
  )
}
