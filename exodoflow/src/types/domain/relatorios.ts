// Tipos de domínio — Módulo de Relatórios Financeiros (F3)
// NÃO é contabilidade oficial. Relatórios são simulados (sem provider real).

// Tipo de relatório
export type RelatorioTipo = 'relatorio_diario' | 'relatorio_mensal'

// Configurações de relatório por tenant (armazenadas em tenant.settings.relatorio)
export interface RelatorioSettings {
  email_destino:     string   // e-mail de destino (simulado)
  hora_envio:        string   // HH:MM em UTC (ex: "08:00")
  relatorio_diario:  boolean  // activar envio automático diário (simulado)
  relatorio_mensal:  boolean  // activar envio automático mensal (simulado)
}

// Corpo gerado de um relatório (texto puro, sem HTML)
export interface RelatorioGerado {
  tipo:     RelatorioTipo
  periodo:  string           // 'YYYY-MM-DD' para diário, 'YYYY-MM' para mensal
  assunto:  string           // linha de assunto do e-mail
  corpo:    string           // corpo em texto plano
  resumo: {
    entradas: number
    saidas:   number
    saldo:    number
    currency: string
  }
}

// Log de relatório (registo em communication_logs)
export interface RelatorioLog {
  id:         string
  tenant_id:  string
  event_type: RelatorioTipo
  recipient:  string
  body:       string
  status:     'simulated' | 'sent' | 'failed'
  created_at: string
}
