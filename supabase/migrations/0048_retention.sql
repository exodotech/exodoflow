-- =============================================================================
-- 0048 — RETENÇÃO AUTOMÁTICA (conservadora, opt-in)
--
-- Aplica a política de retenção APENAS a dados transitórios e de baixo risco, e
-- SÓ quando o tenant configura explicitamente os dias em settings.retention.*
-- (por omissão, nada é apagado). NUNCA toca em dados críticos/legais: finanças,
-- recibos, fichas de tratamento, clientes, marcações, consentimentos, auditoria.
--
-- Config por tenant (em tenants.settings):
--   "retention": {
--     "waitlist_days": 30,        -- limpa entradas RESOLVIDAS (scheduled/cancelled)
--     "reviews_days": 730,
--     "whatsapp_days": 180,
--     "ai_context_days": 30
--   }
--
-- Chamável só pelo SISTEMA (service_role / postgres). Cron diário em vercel.json.
-- =============================================================================
CREATE OR REPLACE FUNCTION aplicar_retencao()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_t      RECORD;
  v_ret    JSONB;
  v_d      INT;
  n        INT;
  v_total  JSONB := '{"waitlist":0,"reviews":0,"whatsapp":0,"ai":0}'::jsonb;
BEGIN
  -- Só o sistema pode aplicar retenção (operação destrutiva em massa).
  IF COALESCE(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') <> 'service_role'
     AND current_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'aplicar_retencao só pode ser chamada pelo sistema';
  END IF;

  FOR v_t IN SELECT id, COALESCE(settings->'retention', '{}'::jsonb) AS ret
             FROM tenants WHERE deleted_at IS NULL LOOP
    v_ret := v_t.ret;

    -- Lista de espera RESOLVIDA (mantém 'waiting'/'contacted' ativos)
    v_d := NULLIF(v_ret->>'waitlist_days', '')::int;
    IF v_d IS NOT NULL AND v_d > 0 THEN
      DELETE FROM waitlist WHERE tenant_id = v_t.id
        AND status IN ('scheduled', 'cancelled')
        AND updated_at < now() - make_interval(days => v_d);
      GET DIAGNOSTICS n = ROW_COUNT;
      v_total := jsonb_set(v_total, '{waitlist}', to_jsonb((v_total->>'waitlist')::int + n));
    END IF;

    -- Avaliações
    v_d := NULLIF(v_ret->>'reviews_days', '')::int;
    IF v_d IS NOT NULL AND v_d > 0 THEN
      DELETE FROM reviews WHERE tenant_id = v_t.id
        AND created_at < now() - make_interval(days => v_d);
      GET DIAGNOSTICS n = ROW_COUNT;
      v_total := jsonb_set(v_total, '{reviews}', to_jsonb((v_total->>'reviews')::int + n));
    END IF;

    -- Mensagens de WhatsApp (mantém as conversas; só apaga mensagens antigas)
    v_d := NULLIF(v_ret->>'whatsapp_days', '')::int;
    IF v_d IS NOT NULL AND v_d > 0 THEN
      DELETE FROM whatsapp_messages WHERE tenant_id = v_t.id
        AND created_at < now() - make_interval(days => v_d);
      GET DIAGNOSTICS n = ROW_COUNT;
      v_total := jsonb_set(v_total, '{whatsapp}', to_jsonb((v_total->>'whatsapp')::int + n));
    END IF;

    -- Contexto efémero da IA
    v_d := NULLIF(v_ret->>'ai_context_days', '')::int;
    IF v_d IS NOT NULL AND v_d > 0 THEN
      DELETE FROM ai_contexts WHERE tenant_id = v_t.id
        AND created_at < now() - make_interval(days => v_d);
      GET DIAGNOSTICS n = ROW_COUNT;
      v_total := jsonb_set(v_total, '{ai}', to_jsonb((v_total->>'ai')::int + n));
    END IF;
  END LOOP;

  RETURN v_total;
END;
$$;

COMMENT ON FUNCTION aplicar_retencao() IS 'Retenção conservadora opt-in (só categorias transitórias configuradas). Sistema apenas.';

-- Não exposta como RPC público: só o sistema (service_role) a chama.
REVOKE ALL ON FUNCTION aplicar_retencao() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION aplicar_retencao() TO service_role;
