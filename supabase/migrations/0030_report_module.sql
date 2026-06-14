-- =============================================================================
-- MIGRAÇÃO 0030: MÓDULO DE RELATÓRIOS FINANCEIROS (F3)
-- Projecto: ExodoFlow AI
-- Descrição: Infra mínima para relatórios diários/mensais de caixa.
--   • Relatórios são SIMULADOS (sem provider de e-mail real nesta fase).
--   • Configurações ficam no JSONB tenant.settings (sem coluna nova).
--   • Logs ficam em communication_logs com event_type 'relatorio_diario'/'relatorio_mensal'.
--   • channel 'email' já existe e é re-usado para este canal de relatório.
-- =============================================================================

-- Índice para consulta eficiente de logs de relatório por tenant
CREATE INDEX IF NOT EXISTS idx_comm_logs_report
  ON communication_logs (tenant_id, event_type, created_at DESC)
  WHERE event_type IN ('relatorio_diario', 'relatorio_mensal');

-- Documenta a estrutura de report_settings no JSONB tenant.settings
COMMENT ON COLUMN tenants.settings IS
  'Configurações operacionais do tenant (JSONB). Campos conhecidos:
   timezone TEXT, currency TEXT, locale TEXT, slot_interval_minutes INT,
   booking_advance_days INT, cancellation_hours INT,
   branding: { primary_color, logo_url?, theme_mode },
   relatorio: { email_destino TEXT, hora_envio TEXT (HH:MM UTC),
                relatorio_diario BOOL, relatorio_mensal BOOL }';
