'use client'
// PainelRelatorios — configuração de relatórios financeiros automáticos (F3).
// Envio simulado (sem provider de e-mail real). Apenas OWNER + MANAGER.
import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Send, Info } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import SectionHeader from '@/components/design-system/SectionHeader/SectionHeader'
import { Button }    from '@/components/design-system/Button/Button'
import { useAuth }   from '@/providers/AuthProvider'
import { usePermissions } from '@/hooks/usePermissions'
import { guardarRelatorioSettings } from '@/services/relatorios-config'
import { useGerarRelatorio } from '@/hooks/useRelatorios'
import { relatorioSettingsSchema, type RelatorioSettingsInput } from '@/lib/validators/relatorio'
import type { TenantSettings } from '@/types/domain/tenant'
import type { RelatorioSettings } from '@/types/domain/relatorios'

export function PainelRelatorios() {
  const { can }   = usePermissions()
  const { tenant, refreshTenant } = useAuth()
  const qc        = useQueryClient()

  const settings  = (tenant?.settings ?? {}) as unknown as TenantSettings
  const relatorio = settings.relatorio as RelatorioSettings | undefined

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<RelatorioSettingsInput>({
    resolver: zodResolver(relatorioSettingsSchema),
    defaultValues: {
      email_destino:    relatorio?.email_destino    ?? '',
      hora_envio:       relatorio?.hora_envio       ?? '08:00',
      relatorio_diario: relatorio?.relatorio_diario ?? false,
      relatorio_mensal: relatorio?.relatorio_mensal ?? false,
    },
  })

  // Preenche o form quando o tenant carrega
  useEffect(() => {
    if (relatorio) {
      reset({
        email_destino:    relatorio.email_destino    ?? '',
        hora_envio:       relatorio.hora_envio       ?? '08:00',
        relatorio_diario: relatorio.relatorio_diario ?? false,
        relatorio_mensal: relatorio.relatorio_mensal ?? false,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id])

  const salvar = useMutation({
    mutationFn: (input: RelatorioSettingsInput) => guardarRelatorioSettings(input),
    onSuccess: async () => {
      await refreshTenant()
      void qc.invalidateQueries({ queryKey: ['relatorios'] })
      reset(undefined, { keepValues: true })
    },
  })

  const gerarDiario  = useGerarRelatorio()
  const gerarMensal  = useGerarRelatorio()

  const canEdit = can('financas.manage')

  const inputCls = 'w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-[color:var(--tenant-primary)] disabled:bg-gray-50 disabled:cursor-not-allowed'

  return (
    <div className="max-w-2xl space-y-6">

      {/* Aviso: simulação */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          Os relatórios são <strong>simulados</strong> — gerados e registados internamente, mas
          não enviados por e-mail real nesta fase. O histórico fica disponível em{' '}
          <a href="/dashboard/relatorios" className="underline">Relatórios</a>.
        </p>
      </div>

      {/* Configurações */}
      <form onSubmit={handleSubmit((d) => salvar.mutate(d))} className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm p-6 space-y-4">
        <SectionHeader title="Configurações de Relatório" />
        <p className="text-sm text-gray-500">
          Configure o e-mail de destino e os relatórios automáticos (simulados).
        </p>

        {/* E-mail de destino */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            E-mail de destino
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              {...register('email_destino')}
              type="email"
              placeholder="financeiro@suaempresa.pt"
              disabled={!canEdit}
              className={`${inputCls} pl-9`}
            />
          </div>
          {errors.email_destino && (
            <p className="text-xs text-red-600 mt-1">{errors.email_destino.message}</p>
          )}
        </div>

        {/* Hora de envio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hora de envio automático <span className="text-gray-400 font-normal">(UTC, HH:MM)</span>
          </label>
          <input
            {...register('hora_envio')}
            type="time"
            disabled={!canEdit}
            className={inputCls}
          />
          {errors.hora_envio && (
            <p className="text-xs text-red-600 mt-1">{errors.hora_envio.message}</p>
          )}
        </div>

        {/* Toggles */}
        <div className="space-y-3 pt-1">
          {[
            { name: 'relatorio_diario' as const, label: 'Relatório diário', desc: 'Resumo de caixa do dia.' },
            { name: 'relatorio_mensal' as const, label: 'Relatório mensal', desc: 'Resumo de caixa do mês (enviado no 1.º dia do mês seguinte).' },
          ].map(({ name, label, desc }) => (
            <label key={name} className={`flex items-center justify-between p-4 rounded-lg border border-gray-200 ${canEdit ? 'cursor-pointer hover:bg-gray-50' : 'opacity-60'}`}>
              <div>
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
              <input
                {...register(name)}
                type="checkbox"
                disabled={!canEdit}
                className="w-4 h-4 rounded accent-[color:var(--tenant-primary)]"
              />
            </label>
          ))}
        </div>

        {canEdit && (
          <div className="pt-2">
            <Button type="submit" size="md" disabled={!isDirty || salvar.isPending}>
              {salvar.isPending ? 'A guardar...' : 'Guardar configurações'}
            </Button>
            {salvar.isError && (
              <p className="text-xs text-red-600 mt-2">{(salvar.error as Error).message}</p>
            )}
            {salvar.isSuccess && (
              <p className="text-xs text-emerald-600 mt-2">Configurações guardadas.</p>
            )}
          </div>
        )}
      </form>

      {/* Trigger manual */}
      {canEdit && (
        <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm p-6 space-y-4">
          <SectionHeader title="Gerar relatório agora" />
          <p className="text-sm text-gray-500">
            Gera e loga um relatório imediatamente, sem aguardar o agendamento automático.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Button
              size="md"
              variant="outline"
              className="gap-2"
              disabled={gerarDiario.isPending}
              onClick={() => gerarDiario.mutate({ tipo: 'relatorio_diario' })}
            >
              <Send className="w-4 h-4" />
              {gerarDiario.isPending ? 'A gerar...' : 'Relatório de hoje'}
            </Button>
            <Button
              size="md"
              variant="outline"
              className="gap-2"
              disabled={gerarMensal.isPending}
              onClick={() => gerarMensal.mutate({ tipo: 'relatorio_mensal' })}
            >
              <Send className="w-4 h-4" />
              {gerarMensal.isPending ? 'A gerar...' : 'Relatório deste mês'}
            </Button>
          </div>
          {gerarDiario.isSuccess && (
            <p className="text-xs text-emerald-600">
              Relatório diário gerado e logado. Veja o histórico em{' '}
              <a href="/dashboard/relatorios" className="underline">Relatórios</a>.
            </p>
          )}
          {gerarMensal.isSuccess && (
            <p className="text-xs text-emerald-600">
              Relatório mensal gerado e logado. Veja o histórico em{' '}
              <a href="/dashboard/relatorios" className="underline">Relatórios</a>.
            </p>
          )}
          {(gerarDiario.isError || gerarMensal.isError) && (
            <p className="text-xs text-red-600">
              {((gerarDiario.error ?? gerarMensal.error) as Error | null)?.message}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
