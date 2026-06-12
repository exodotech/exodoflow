'use client'
import React, { useState } from 'react'
import {
  Building2, CreditCard, Plug, Layers,
  Globe, MessageSquare, FileText, Palette, MessageCircle,
} from 'lucide-react'
import PageHeader  from '@/components/design-system/PageHeader/PageHeader'
import AccessDenied from '@/components/design-system/AccessDenied/AccessDenied'
import { PainelEmpresa }           from '@/components/features/configuracoes/PainelEmpresa'
import { PainelBranding }          from '@/components/features/configuracoes/PainelBranding'
import { PainelLocalizacao }       from '@/components/features/configuracoes/PainelLocalizacao'
import { PainelComunicacao }       from '@/components/features/configuracoes/PainelComunicacao'
import { PainelTemplatesMensagem } from '@/components/features/configuracoes/PainelTemplatesMensagem'
import { PainelPlano }             from '@/components/features/configuracoes/PainelPlano'
import { PainelIntegracoes }       from '@/components/features/configuracoes/PainelIntegracoes'
import { PainelTemplates }         from '@/components/features/configuracoes/PainelTemplates'
import { PainelWhatsApp }          from '@/components/features/configuracoes/PainelWhatsApp'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth }        from '@/providers/AuthProvider'
import type { SupportedLocale } from '@/types/domain'

type Tab =
  | 'empresa' | 'branding' | 'localizacao' | 'comunicacao' | 'whatsapp'
  | 'templates_mensagem' | 'plano' | 'integracoes' | 'templates'

const TABS: Array<{ value: Tab; label: string; icon: React.ReactNode }> = [
  { value: 'empresa',            label: 'Empresa',     icon: <Building2     className="w-4 h-4" /> },
  { value: 'branding',           label: 'Branding',    icon: <Palette       className="w-4 h-4" /> },
  { value: 'localizacao',        label: 'Localização', icon: <Globe         className="w-4 h-4" /> },
  { value: 'comunicacao',        label: 'Comunicação', icon: <MessageSquare className="w-4 h-4" /> },
  { value: 'whatsapp',           label: 'WhatsApp',    icon: <MessageCircle className="w-4 h-4" /> },
  { value: 'templates_mensagem', label: 'Mensagens',   icon: <FileText      className="w-4 h-4" /> },
  { value: 'plano',              label: 'Plano',       icon: <CreditCard    className="w-4 h-4" /> },
  { value: 'integracoes',        label: 'Integrações', icon: <Plug          className="w-4 h-4" /> },
  { value: 'templates',          label: 'Templates',   icon: <Layers        className="w-4 h-4" /> },
]

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('empresa')
  const { can, isOwner, isManagerOrAbove } = usePermissions()
  const { tenant } = useAuth()

  // Dados reais do tenant autenticado (AuthProvider hidrata do servidor)
  const settings = (tenant?.settings ?? null) as {
    timezone: string; currency: string; slot_interval_minutes: number; locale?: SupportedLocale
  } | null
  const locale: SupportedLocale = settings?.locale ?? 'pt-PT'

  // Protecção de página — após todos os hooks (Rules of Hooks)
  if (!can('configuracoes.view')) {
    return <AccessDenied description="Não tem permissão para aceder às configurações. Contacte o proprietário da conta." />
  }

  return (
    <div>
      <PageHeader title="Configurações" description="Gerencie as configurações da sua conta" />

      {/* Separadores de navegação */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-6 border-b border-gray-200 scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            style={activeTab === tab.value ? { borderColor: 'var(--tenant-primary)', color: 'var(--tenant-primary)' } : undefined}
            className={`flex items-center gap-2 flex-shrink-0 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
              activeTab === tab.value
                ? ''
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Banner de permissão */}
      {!isOwner && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2">
          <span className="text-xs font-medium text-amber-800">
            {isManagerOrAbove
              ? 'Acesso de Gestor — pode ver e editar configurações operacionais. Billing e gestão de equipa são exclusivos do Proprietário.'
              : 'Acesso limitado — algumas configurações são reservadas a proprietários e gestores.'}
          </span>
        </div>
      )}

      {/* Paineis de conteúdo — cada tab é um componente ≤ 250 linhas */}
      {activeTab === 'empresa'            && <PainelEmpresa settings={settings} />}
      {activeTab === 'branding'           && <PainelBranding />}
      {activeTab === 'localizacao'        && <PainelLocalizacao locale={locale} settings={settings} />}
      {activeTab === 'comunicacao'        && <PainelComunicacao />}
      {activeTab === 'whatsapp'           && <PainelWhatsApp />}
      {activeTab === 'templates_mensagem' && <PainelTemplatesMensagem />}
      {activeTab === 'plano'              && <PainelPlano locale={locale} />}
      {activeTab === 'integracoes'        && <PainelIntegracoes />}
      {activeTab === 'templates'          && <PainelTemplates locale={locale} niche={tenant?.business_type} />}
    </div>
  )
}
