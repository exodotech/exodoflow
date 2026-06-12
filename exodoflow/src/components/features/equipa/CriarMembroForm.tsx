'use client'
// Formulário "Adicionar membro" — SOMENTE OWNER (gate no componente pai).
// Cria o membro via /api/equipa/criar-membro; mostra as credenciais a entregar.
import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Copy, Check, UserPlus } from 'lucide-react'
import { Button } from '@/components/design-system/Button/Button'
import { Input }  from '@/components/design-system/Input/Input'
import { listarRecursosVinculaveis } from '@/services/equipa'

type MembroRole = 'manager' | 'receptionist' | 'staff'

const ROLE_OPCOES: Array<{ value: MembroRole; label: string; desc: string }> = [
  { value: 'manager',      label: 'Gestor',        desc: 'Agenda, clientes, serviços, recursos e relatórios' },
  { value: 'receptionist', label: 'Recepcionista', desc: 'Agenda, clientes e conversas' },
  { value: 'staff',        label: 'Colaborador',   desc: 'Apenas a sua própria agenda' },
]

function gerarPassword(): string {
  const pool = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let pwd = ''
  for (let i = 0; i < 9; i++) pwd += pool[Math.floor(Math.random() * pool.length)]
  pwd += '23456789'[Math.floor(Math.random() * 8)]
  pwd += '!@#$%&*'[Math.floor(Math.random() * 7)]
  return pwd
}

interface CriadoInfo { email: string; password: string; role: MembroRole }

export function CriarMembroForm() {
  const qc = useQueryClient()

  const [email, setEmail]       = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole]         = useState<MembroRole>('receptionist')
  const [resourceId, setResourceId] = useState('')
  const [password, setPassword] = useState(gerarPassword)
  const [loading, setLoading]   = useState(false)
  const [erro, setErro]         = useState<string | null>(null)
  const [criado, setCriado]     = useState<CriadoInfo | null>(null)
  const [copiado, setCopiado]   = useState(false)

  // Recursos humanos livres — só carregados/mostrados quando role=staff
  const { data: recursos = [] } = useQuery({
    queryKey: ['recursos-vinculaveis'],
    queryFn:  listarRecursosVinculaveis,
    enabled:  role === 'staff',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null); setCriado(null); setLoading(true)
    try {
      const res = await fetch('/api/equipa/criar-membro', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email, password, full_name: fullName, role,
          resource_id: role === 'staff' ? resourceId : '',
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error ?? 'Erro ao criar membro.'); return }
      setCriado({ email, password, role })
      setEmail(''); setFullName(''); setResourceId(''); setPassword(gerarPassword())
      void qc.invalidateQueries({ queryKey: ['equipa'] })
      void qc.invalidateQueries({ queryKey: ['recursos-vinculaveis'] })
    } catch {
      setErro('Erro de rede ao criar membro.')
    } finally {
      setLoading(false)
    }
  }

  async function copiar() {
    if (!criado) return
    await navigator.clipboard.writeText(`Email: ${criado.email}\nPalavra-passe: ${criado.password}`)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
        <UserPlus className="w-4 h-4" /> Adicionar membro
      </h2>
      <p className="text-xs text-gray-500 mb-4">
        O membro entra na sua conta de imediato. Entregue-lhe as credenciais geradas.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4 max-w-md">
        <Input
          label="E-mail do membro"
          type="email"
          required
          placeholder="membro@empresa.pt"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Nome (opcional)"
          placeholder="João Costa"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Função</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as MembroRole)}
            className="w-full h-11 px-3 rounded-lg border border-gray-300 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ROLE_OPCOES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {ROLE_OPCOES.find((o) => o.value === role)?.desc}
          </p>
        </div>

        {/* Vincular a um recurso — só para colaboradores (staff) */}
        {role === 'staff' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recurso associado (opcional)
            </label>
            {recursos.length === 0 ? (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2.5">
                Não há recursos livres. Crie um recurso do tipo &quot;colaborador&quot; em Recursos
                para ligar a agenda deste membro.
              </p>
            ) : (
              <>
                <select
                  value={resourceId}
                  onChange={(e) => setResourceId(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-gray-300 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Não vincular agora</option>
                  {recursos.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Liga a agenda do colaborador ao recurso seleccionado.
                </p>
              </>
            )}
          </div>
        )}

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

        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{erro}</p>
          </div>
        )}

        <Button type="submit" isLoading={loading} disabled={loading || !email}>
          Adicionar membro
        </Button>
      </form>

      {criado && (
        <div className="mt-5 max-w-md bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-800 mb-2">
            Membro adicionado. Entregue estas credenciais:
          </p>
          <div className="bg-white rounded-md border border-green-200 p-3 font-mono text-xs text-gray-800 space-y-1">
            <div><span className="text-gray-500">Email:</span> {criado.email}</div>
            <div><span className="text-gray-500">Palavra-passe:</span> {criado.password}</div>
          </div>
          <button
            type="button"
            onClick={copiar}
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
