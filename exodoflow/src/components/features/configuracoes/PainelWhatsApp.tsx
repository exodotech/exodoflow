'use client'
// Painel WhatsApp (Configurações) — Fase 0: preparação, SEM integração real.
// Mostra o estado (Não configurado), o número da empresa (leitura) e um botão
// desactivado "em breve". Nenhuma acção liga o WhatsApp real nesta fase.
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { MessageCircle, Lock } from 'lucide-react'
import SectionHeader from '@/components/design-system/SectionHeader/SectionHeader'
import { Button } from '@/components/design-system/Button/Button'
import { Badge }  from '@/components/design-system/Badge/Badge'
import { obterEstadoWhatsApp } from '@/services/whatsapp'

export function PainelWhatsApp() {
  const { data } = useQuery({ queryKey: ['whatsapp-estado'], queryFn: obterEstadoWhatsApp })
  const ligado = data?.is_active === true   // sempre false na Fase 0

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <SectionHeader title="WhatsApp" />
          <Badge variant={ligado ? 'success' : 'default'}>
            {ligado ? 'Ligado' : 'Não configurado'}
          </Badge>
        </div>

        <p className="text-sm text-gray-600 mt-3">
          Ligue o WhatsApp da sua empresa para automatizar a comunicação com clientes.
          A integração com a <strong>Meta WhatsApp Cloud API</strong> está a ser preparada
          e ficará disponível em breve.
        </p>

        {/* Número da empresa — leitura (configurável quando o WhatsApp for ligado) */}
        <div className="mt-5">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Número da empresa
          </label>
          <input
            type="tel"
            value={data?.numero ?? ''}
            readOnly
            disabled
            placeholder="Será definido ao ligar o WhatsApp"
            className="w-full h-11 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500"
          />
        </div>

        {/* Botão desactivado — em breve */}
        <div className="mt-5 flex items-center gap-3">
          <Button size="md" disabled className="gap-2">
            <Lock className="w-4 h-4" /> Ligar WhatsApp — em breve
          </Button>
          <span className="text-xs text-gray-400">Integração real ainda não disponível.</span>
        </div>
      </div>

      {/* Nota: o simulador */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <MessageCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          Enquanto o WhatsApp real não está ligado, a página <strong>Conversas</strong> funciona
          em <strong>modo simulador</strong> com mensagens de exemplo (nada é enviado nem recebido).
        </p>
      </div>
    </div>
  )
}
