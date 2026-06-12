'use client'
// Formulário "Criar empresa" do painel /admin (SOMENTE SUPERADMIN).
// Cria o OWNER inicial via /api/admin/criar-empresa; o trigger provisiona o
// tenant + profile. Mostra as credenciais para entregar ao proprietário.
import React, { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Copy, Check } from 'lucide-react'
import { Button } from '@/components/design-system/Button/Button'
import { Input }  from '@/components/design-system/Input/Input'

// Gera uma palavra-passe temporária legível (≥ 8 caracteres, com símbolo e dígito)
function gerarPassword(): string {
  const letras  = 'abcdefghijkmnpqrstuvwxyz'
  const maius   = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const nums    = '23456789'
  const simbolos = '!@#$%&*'
  const pool = letras + maius + nums
  let pwd = ''
  for (let i = 0; i < 9; i++) pwd += pool[Math.floor(Math.random() * pool.length)]
  // Garantir pelo menos um dígito e um símbolo
  pwd += nums[Math.floor(Math.random() * nums.length)]
  pwd += simbolos[Math.floor(Math.random() * simbolos.length)]
  return pwd
}

interface CriadaInfo { email: string; password: string; tenantSlug: string | null }

const NICHOS = [
  { value: 'estetica', label: 'Estética' }, { value: 'veterinaria', label: 'Veterinária' },
  { value: 'barbearia', label: 'Barbearia' }, { value: 'dentista', label: 'Dentista' },
  { value: 'oficina', label: 'Oficina' }, { value: 'fisioterapia', label: 'Fisioterapia' },
  { value: 'outro', label: 'Outro' },
]

export function CriarEmpresaForm() {
  const qc = useQueryClient()

  const [email, setEmail]       = useState('')
  const [fullName, setFullName] = useState('')
  const [country, setCountry]   = useState<'PT' | 'BR'>('PT')
  const [nicho, setNicho]       = useState('estetica')
  const [password, setPassword] = useState(gerarPassword)
  const [loading, setLoading]   = useState(false)
  const [erro, setErro]         = useState<string | null>(null)
  const [criada, setCriada]     = useState<CriadaInfo | null>(null)
  const [copiado, setCopiado]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setCriada(null)
    setLoading(true)
    try {
      const res = await fetch('/api/admin/criar-empresa', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password, full_name: fullName, country, business_type: nicho }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErro(data.error ?? 'Erro ao criar empresa.')
        return
      }
      setCriada({ email, password, tenantSlug: data.tenantSlug ?? null })
      // Limpar o formulário e actualizar a lista de empresas
      setEmail(''); setFullName(''); setPassword(gerarPassword())
      void qc.invalidateQueries({ queryKey: ['admin-tenants'] })
    } catch {
      setErro('Erro de rede ao criar empresa.')
    } finally {
      setLoading(false)
    }
  }

  async function copiarCredenciais() {
    if (!criada) return
    const texto = `Email: ${criada.email}\nPalavra-passe: ${criada.password}`
    await navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-sm font-semibold text-gray-900 mb-1">Criar nova empresa</h2>
      <p className="text-xs text-gray-500 mb-4">
        Cria o proprietário inicial. O tenant é provisionado automaticamente e o
        proprietário completa o onboarding no primeiro login.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4 max-w-md">
        <Input
          label="E-mail do proprietário"
          type="email"
          required
          placeholder="proprietario@empresa.pt"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Nome do proprietário (opcional)"
          placeholder="Maria Silva"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Palavra-passe temporária
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 h-11 px-3 rounded-lg border border-gray-300 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setPassword(gerarPassword())}
              title="Gerar nova palavra-passe"
              className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* País e nicho — definidos AGORA pelo superadmin; imutáveis depois */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value as 'PT' | 'BR')}
              className="w-full h-11 px-3 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="PT">🇵🇹 Portugal</option>
              <option value="BR">🇧🇷 Brasil</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nicho</label>
            <select
              value={nicho}
              onChange={(e) => setNicho(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {NICHOS.map((n) => (
                <option key={n.value} value={n.value}>{n.label}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-400 -mt-2">
          País e nicho ficam definidos na criação. O proprietário não os altera depois.
        </p>

        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{erro}</p>
          </div>
        )}

        <Button type="submit" isLoading={loading} disabled={loading || !email}>
          Criar empresa
        </Button>
      </form>

      {/* Credenciais geradas — entregar ao proprietário */}
      {criada && (
        <div className="mt-5 max-w-md bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-800 mb-2">
            Empresa criada. Entregue estas credenciais ao proprietário:
          </p>
          <div className="bg-white rounded-md border border-green-200 p-3 font-mono text-xs text-gray-800 space-y-1">
            <div><span className="text-gray-500">Email:</span> {criada.email}</div>
            <div><span className="text-gray-500">Palavra-passe:</span> {criada.password}</div>
            {criada.tenantSlug && (
              <div><span className="text-gray-500">Slug inicial:</span> {criada.tenantSlug}</div>
            )}
          </div>
          <button
            type="button"
            onClick={copiarCredenciais}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-green-700 hover:text-green-900"
          >
            {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiado ? 'Copiado!' : 'Copiar credenciais'}
          </button>
        </div>
      )}
    </div>
  )
}
