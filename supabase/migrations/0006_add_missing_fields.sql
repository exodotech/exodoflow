-- =============================================================================
-- MIGRAÇÃO 0006: CAMPOS EM FALTA (auditoria)
-- Projecto: ExodoFlow AI
-- Descrição: Adiciona campos identificados pela auditoria estrutural como
--            necessários para SaaS comercial e WhatsApp simulator.
-- =============================================================================


-- =============================================================================
-- TABELA: plans — campos de limite em falta
-- max_users:    limite de utilizadores (profiles) por tenant
-- max_messages: limite de mensagens WhatsApp por mês
-- =============================================================================
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS max_users    INTEGER,
  ADD COLUMN IF NOT EXISTS max_messages INTEGER;

COMMENT ON COLUMN plans.max_users    IS 'Máximo de utilizadores (profiles) por tenant neste plano. NULL = ilimitado.';
COMMENT ON COLUMN plans.max_messages IS 'Máximo de mensagens WhatsApp enviadas/recebidas por mês. NULL = ilimitado.';


-- =============================================================================
-- TABELA: whatsapp_messages — estado de processamento
-- processed_status: rastreia se a mensagem foi processada pelo motor de IA.
--   pending    → chegou mas ainda não foi processada
--   processing → em processamento (evita processamento duplo)
--   processed  → processada com sucesso
--   failed     → falhou o processamento (requer atenção)
-- =============================================================================
ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS processed_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (processed_status IN ('pending', 'processing', 'processed', 'failed'));

COMMENT ON COLUMN whatsapp_messages.processed_status IS
  'Estado de processamento pelo motor de IA. '
  'pending → processing → processed/failed. '
  'Evita processamento duplo em caso de retry do webhook.';


-- =============================================================================
-- Actualizar dados de seed existentes
-- Definir processed_status = 'processed' para mensagens já existentes
-- (assumindo que mensagens antigas foram processadas)
-- =============================================================================
UPDATE whatsapp_messages
SET processed_status = 'processed'
WHERE processed_status = 'pending'
  AND created_at < NOW() - INTERVAL '1 minute';
