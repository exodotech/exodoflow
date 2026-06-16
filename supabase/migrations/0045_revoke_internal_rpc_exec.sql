-- =============================================================================
-- 0045 — FECHAR EXPOSIÇÃO DE HELPERS INTERNOS COMO RPC PÚBLICO
--
-- log_audit_event e provision_tenant_for_user são funções SECURITY DEFINER de
-- uso INTERNO (chamadas por triggers/sistema), mas tinham EXECUTE para PUBLIC
-- (default) → qualquer 'anon'/'authenticated' podia invocá-las via PostgREST:
--   • log_audit_event(p_tenant_id, ...) → injeção no trilho de auditoria de
--     qualquer tenant (entradas forjadas);
--   • provision_tenant_for_user(p_user_id, ...) → provisionar/manipular tenants,
--     contornando o registo desativado (enable_signup=false).
--
-- A app NÃO as chama como RPC (confirmado). Os triggers internos invocam-nas em
-- contexto SECURITY DEFINER (role = dono), por isso revogar de PUBLIC/anon/
-- authenticated não afeta o funcionamento interno. service_role mantém EXECUTE
-- para eventuais rotinas de sistema.
-- =============================================================================

REVOKE ALL ON FUNCTION log_audit_event(uuid, text, text, uuid, jsonb, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION provision_tenant_for_user(uuid, text, text)
  FROM PUBLIC, anon, authenticated;

-- Sistema (rotinas server-side com service_role) continua a poder chamar.
GRANT EXECUTE ON FUNCTION log_audit_event(uuid, text, text, uuid, jsonb, jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION provision_tenant_for_user(uuid, text, text) TO service_role;
