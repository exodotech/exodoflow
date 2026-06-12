-- =============================================================================
-- MIGRAÇÃO 0026: IDEMPOTÊNCIA DE MENSAGENS WHATSAPP (webhook inbound)
-- Projecto: ExodoFlow AI
-- Descrição: A Meta entrega o webhook "at-least-once" — reenvia o mesmo
--            wa_message_id em caso de timeout. Para não duplicar mensagens,
--            criamos um índice ÚNICO parcial por (tenant_id, wa_message_id).
--            O mapper inbound usa ON CONFLICT DO NOTHING sobre este índice.
--
-- Parcial (WHERE wa_message_id IS NOT NULL) porque mensagens outbound futuras
-- podem ainda não ter id da Meta no momento da criação.
-- Não-destrutivo: apenas acrescenta um índice.
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_wa_messages_tenant_message
  ON whatsapp_messages (tenant_id, wa_message_id)
  WHERE wa_message_id IS NOT NULL;
