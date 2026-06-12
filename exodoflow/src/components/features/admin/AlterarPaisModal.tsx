'use client'
// Alterar o país de uma empresa — SOMENTE SUPERADMIN, com CONFIRMAÇÃO FORTE.
// Operação sensível: muda moeda, fuso e tipo de documento fiscal (NIF↔CPF/CNPJ).
// Para confirmar é preciso escrever o nome exacto da empresa.
import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal }  from '@/components/design-system/Modal/Modal'
import { Button } from '@/components/design-system/Button/Button'
import { Input }  from '@/components/design-system/Input/Input'
import { MARKET_LABEL, toMarketCountry, deriveMarketSettings, type MarketCountry } from '@/lib/i18n/market'
import type { EmpresaAdmin } from '@/services/admin'

interface Props {
  empresa:   EmpresaAdmin | null
  isOpen:    boolean
  onClose:   () => void
  onConfirm: (country: MarketCountry) => void
  isLoading: boolean
  error:     string | null
}

const PAISES: MarketCountry[] = ['PT', 'BR']

export function AlterarPaisModal({ empresa, isOpen, onClose, onConfirm, isLoading, error }: Props) {
  // Estado inicializado lazy a partir da empresa. O reset entre empresas é feito
  // pelo `key` no componente pai (remonta), evitando setState dentro de effect.
  const [alvo, setAlvo]               = useState<MarketCountry>(
    () => (empresa && toMarketCountry(empresa.country) === 'BR' ? 'PT' : 'BR'),
  )
  const [confirmacao, setConfirmacao] = useState('')

  if (!empresa) return null

  const atual         = toMarketCountry(empresa.country)
  const mudou         = alvo !== atual
  const mercado       = deriveMarketSettings(alvo)
  const podeConfirmar = mudou && confirmacao.trim() === empresa.name.trim() && !isLoading

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Alterar país da empresa"
      size="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>Cancelar</Button>
          <Button variant="primary" size="sm" disabled={!podeConfirmar} isLoading={isLoading} onClick={() => onConfirm(alvo)}>
            Alterar país
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800">
            Operação sensível. Alterar o país muda <strong>moeda, fuso horário e tipo de documento
            fiscal</strong> (NIF ↔ CPF/CNPJ) de <strong>{empresa.name}</strong>. Use apenas para corrigir
            um erro de criação.
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">País actual</p>
          <p className="text-sm text-gray-900">{MARKET_LABEL[atual]}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Novo país</p>
          <div className="flex gap-2">
            {PAISES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAlvo(p)}
                className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                  alvo === p
                    ? 'border-[color:var(--tenant-primary)] bg-blue-50 text-gray-900'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {MARKET_LABEL[p]}
              </button>
            ))}
          </div>
        </div>

        {mudou && (
          <p className="text-xs text-gray-600 p-3 bg-gray-50 rounded-lg border border-gray-200">
            Depois da mudança: moeda <strong>{mercado.currency}</strong> · fuso <strong>{mercado.timezone}</strong> · locale <strong>{mercado.locale}</strong>
          </p>
        )}

        <Input
          label={`Para confirmar, escreva o nome da empresa: "${empresa.name}"`}
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          placeholder={empresa.name}
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
