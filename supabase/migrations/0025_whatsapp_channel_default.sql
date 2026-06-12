-- =============================================================================
-- MIGRAÇÃO 0025: CANAL WHATSAPP DESACTIVADO POR PADRÃO (Fase WhatsApp 0)
-- Projecto: ExodoFlow AI
-- Descrição: Preparação da UI/config para futura integração WhatsApp, SEM
--            integração real. Garante que cada tenant tem uma linha em
--            communication_channels para o canal 'whatsapp' com is_active=FALSE.
--            NÃO cria webhook, tokens, Meta API, IA, nem envio real.
--
-- Não-destrutivo: backfill idempotente (ON CONFLICT DO NOTHING) + trigger para
-- novos tenants. is_active=FALSE = canal existe mas está desligado.
-- =============================================================================

-- ── Trigger: novo tenant nasce com o canal whatsapp desligado ─────────────────
CREATE OR REPLACE FUNCTION ensure_whatsapp_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO communication_channels (tenant_id, channel, is_active)
  VALUES (NEW.id, 'whatsapp', FALSE)
  ON CONFLICT (tenant_id, channel) DO NOTHING;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION ensure_whatsapp_channel() IS
  'Garante um canal whatsapp desactivado (is_active=FALSE) para cada novo tenant. WhatsApp real entra noutra fase.';

DROP TRIGGER IF EXISTS trigger_ensure_whatsapp_channel ON tenants;
CREATE TRIGGER trigger_ensure_whatsapp_channel
  AFTER INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION ensure_whatsapp_channel();

-- ── Backfill: tenants existentes ──────────────────────────────────────────────
INSERT INTO communication_channels (tenant_id, channel, is_active)
SELECT id, 'whatsapp', FALSE FROM tenants
ON CONFLICT (tenant_id, channel) DO NOTHING;
