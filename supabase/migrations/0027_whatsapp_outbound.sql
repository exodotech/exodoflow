-- =============================================================================
-- MIGRAÇÃO 0027: WHATSAPP FASE 1B — RESPOSTA MANUAL OUTBOUND
-- Projecto: ExodoFlow AI
-- Descrição: Suporte ao envio manual humano (sem IA, sem templates):
--   1. whatsapp_conversations.internal_notes — notas internas da equipa por
--      conversa (NÃO são enviadas ao WhatsApp; só a equipa vê).
--   2. processed_status passa a aceitar 'sent' — estado das mensagens OUTBOUND
--      enviadas (as inbound continuam 'pending' à espera de processamento futuro).
--
-- Não-destrutivo: adiciona coluna + alarga um CHECK (não remove valores).
-- =============================================================================

-- ── 1. Notas internas por conversa ────────────────────────────────────────────
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS internal_notes TEXT;

COMMENT ON COLUMN whatsapp_conversations.internal_notes IS
  'Notas internas da equipa sobre a conversa. NUNCA enviadas ao WhatsApp.';

-- ── 2. processed_status aceita 'sent' (mensagens outbound enviadas) ───────────
ALTER TABLE whatsapp_messages DROP CONSTRAINT IF EXISTS whatsapp_messages_processed_status_check;
ALTER TABLE whatsapp_messages
  ADD CONSTRAINT whatsapp_messages_processed_status_check
  CHECK (processed_status = ANY (ARRAY['pending', 'processing', 'processed', 'failed', 'sent']));

COMMENT ON COLUMN whatsapp_messages.processed_status IS
  'inbound: pending→processing→processed (pipeline futuro de IA). outbound: sent. failed em erro.';
