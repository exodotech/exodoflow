-- =============================================================================
-- 0046 — APERTAR GRANTS DE RPCs PÚBLICOS (defesa em profundidade)
--
-- Continuação da 0045. Reduz a superfície de RPCs SECURITY DEFINER expostos a
-- PUBLIC sem necessidade:
--
--   • get_tenant_feature_flag(p_tenant_id, ...) — NÃO é chamada pela app (o
--     portal lê feature_flags via service_role). RPC público inútil que permitia
--     enumerar flags de qualquer tenant. → revogar de PUBLIC/anon/authenticated.
--
--   • get_available_slots(p_tenant_id, ...) — o dashboard chama-a como
--     'authenticated' (necessário), mas o portal público usa o service_role
--     (admin client), não 'anon'. → revogar de 'anon' para travar a enumeração
--     NÃO autenticada da disponibilidade de qualquer tenant. (authenticated
--     mantém; ver nota de follow-up sobre validar p_tenant_id = auth_tenant_id().)
-- =============================================================================

REVOKE ALL ON FUNCTION get_tenant_feature_flag(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_feature_flag(uuid, text) TO service_role;

-- NOTA: como o privilégio vinha de PUBLIC (default), revogar só de 'anon' não
-- basta — é preciso revogar de PUBLIC e re-conceder aos papéis que devem manter.
REVOKE EXECUTE ON FUNCTION
  get_available_slots(uuid, uuid[], uuid, date, date, integer)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION
  get_available_slots(uuid, uuid[], uuid, date, date, integer)
  TO authenticated, service_role;
