-- =============================================================================
-- MIGRAÇÃO 0028: WHATSAPP FASE 1C — TEMPLATES APROVADOS (META)
-- Projecto: ExodoFlow AI
-- Descrição: Prepara mensagens OPERACIONAIS iniciadas pelo negócio através de
--   templates do WhatsApp Cloud API. SEM IA, SEM chatbot, SEM automações.
--
--   1. Alarga communication_templates com os campos específicos da Meta
--      (provider, variables, meta_template_name, meta_language_code,
--       meta_category, meta_status).
--   2. Alarga o CHECK de event_type para suportar dois novos propósitos:
--      booking_reminder_2h e booking_reschedule.
--   3. Mapeia (backfill) os templates WhatsApp existentes para a Meta e semeia
--      os dois novos templates no tenant de exemplo.
--
-- NÃO cria templates oficiais na Meta — apenas mapeia nomes e variáveis locais.
-- Não-destrutivo: só adiciona colunas, alarga um CHECK e faz UPSERT idempotente.
-- =============================================================================

-- ── 1. Campos específicos da Meta em communication_templates ──────────────────
ALTER TABLE communication_templates
  ADD COLUMN IF NOT EXISTS provider           TEXT,
  ADD COLUMN IF NOT EXISTS variables          JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS meta_template_name TEXT,
  ADD COLUMN IF NOT EXISTS meta_language_code TEXT,
  ADD COLUMN IF NOT EXISTS meta_category      TEXT,
  ADD COLUMN IF NOT EXISTS meta_status        TEXT NOT NULL DEFAULT 'PENDING';

-- provider: hoje só 'meta' (WhatsApp). NULL permitido (templates SMS/email legados).
ALTER TABLE communication_templates DROP CONSTRAINT IF EXISTS chk_templates_provider;
ALTER TABLE communication_templates
  ADD CONSTRAINT chk_templates_provider
  CHECK (provider IS NULL OR provider IN ('meta'));

-- meta_category: categorias oficiais da Meta para templates.
ALTER TABLE communication_templates DROP CONSTRAINT IF EXISTS chk_templates_meta_category;
ALTER TABLE communication_templates
  ADD CONSTRAINT chk_templates_meta_category
  CHECK (meta_category IS NULL OR meta_category IN ('UTILITY', 'MARKETING', 'AUTHENTICATION'));

-- meta_status: espelho local do estado de aprovação na Meta (mirror, não cria nada).
ALTER TABLE communication_templates DROP CONSTRAINT IF EXISTS chk_templates_meta_status;
ALTER TABLE communication_templates
  ADD CONSTRAINT chk_templates_meta_status
  CHECK (meta_status IN ('PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED'));

COMMENT ON COLUMN communication_templates.provider           IS 'Fornecedor do template. ''meta'' para WhatsApp Cloud API; NULL para SMS/email.';
COMMENT ON COLUMN communication_templates.variables          IS 'Lista ORDENADA dos nomes das variáveis do corpo (ex: ["nome","servico","data","hora"]). Mapeia para os parâmetros posicionais {{1}},{{2}}... da Meta.';
COMMENT ON COLUMN communication_templates.meta_template_name IS 'Nome do template APROVADO na Meta (snake_case). NULL enquanto não mapeado.';
COMMENT ON COLUMN communication_templates.meta_language_code IS 'Código de idioma da Meta (ex: pt_PT, pt_BR). Deriva do locale.';
COMMENT ON COLUMN communication_templates.meta_category      IS 'Categoria Meta: UTILITY (operacional), MARKETING, AUTHENTICATION.';
COMMENT ON COLUMN communication_templates.meta_status        IS 'Espelho LOCAL do estado de aprovação na Meta. PENDING até aprovação real. O envio real exige APPROVED; o modo mock ignora.';

-- ── 2. Novos propósitos de template (event_type) ──────────────────────────────
-- booking_reminder_2h  — lembrete ~2h antes
-- booking_reschedule   — notificação de reagendamento
-- Não-destrutivo: alarga o CHECK sem remover valores existentes.
ALTER TABLE communication_templates DROP CONSTRAINT IF EXISTS communication_templates_event_type_check;
ALTER TABLE communication_templates
  ADD CONSTRAINT communication_templates_event_type_check
  CHECK (event_type IN (
    'booking_created',
    'booking_confirmed',
    'booking_cancelled',
    'booking_reminder_24h',
    'booking_reminder_1h',
    'booking_reminder_2h',
    'booking_reschedule',
    'booking_completed',
    'booking_no_show'
  ));

-- ── 3. Backfill: mapear templates WhatsApp existentes para a Meta ─────────────
-- Aplica-se a TODOS os tenants (idempotente). Só os 5 propósitos operacionais
-- da Fase 1C são mapeados; booking_created mantém-se apenas para a simulação.
UPDATE communication_templates t SET
  provider           = 'meta',
  meta_category      = 'UTILITY',
  meta_language_code = CASE t.locale WHEN 'pt-BR' THEN 'pt_BR' ELSE 'pt_PT' END,
  meta_template_name = CASE t.event_type
                         WHEN 'booking_confirmed'    THEN 'booking_confirmation'
                         WHEN 'booking_cancelled'    THEN 'booking_cancellation'
                         WHEN 'booking_reminder_24h' THEN 'booking_reminder_24h'
                       END,
  -- Os três propósitos partilham as mesmas variáveis base, por ordem.
  variables          = '["nome","servico","data","hora"]'::jsonb
WHERE t.channel = 'whatsapp'
  AND t.event_type IN ('booking_confirmed', 'booking_cancelled', 'booking_reminder_24h')
  AND t.meta_template_name IS NULL;

-- ── 4. Semear os dois novos templates no tenant de exemplo ────────────────────
DO $$
DECLARE
  v_tenant UUID := 'b1000000-0000-0000-0000-000000000001';
BEGIN
  -- GUARD: numa BD limpa as migrations correm antes do seed.sql (tenant ainda
  -- não existe). Sem este guard o reset falharia com violação de FK.
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = v_tenant) THEN
    RETURN;
  END IF;

  INSERT INTO communication_templates
    (tenant_id, channel, event_type, name, body, locale,
     provider, meta_template_name, meta_language_code, meta_category, meta_status, variables)
  VALUES
    (v_tenant, 'whatsapp', 'booking_reminder_2h',
     'Lembrete 2h',
     'Olá {{nome}}! Faltam ~2h para a sua marcação de {{servico}} às {{hora}}. Até já! 😊',
     'pt-PT', 'meta', 'booking_reminder_2h', 'pt_PT', 'UTILITY', 'PENDING',
     '["nome","servico","hora"]'::jsonb),
    (v_tenant, 'whatsapp', 'booking_reschedule',
     'Marcação Reagendada',
     'Olá {{nome}}! A sua marcação de {{servico}} foi reagendada para {{data}} às {{hora}}. Até breve! ✨',
     'pt-PT', 'meta', 'booking_reschedule', 'pt_PT', 'UTILITY', 'PENDING',
     '["nome","servico","data","hora"]'::jsonb)
  ON CONFLICT (tenant_id, channel, event_type, locale) DO NOTHING;
END;
$$;

-- ── 5. Índice para a busca por propósito de template (envio operacional) ──────
CREATE INDEX IF NOT EXISTS idx_comm_templates_meta
  ON communication_templates (tenant_id, channel, event_type, locale)
  WHERE provider = 'meta' AND is_active = TRUE;
