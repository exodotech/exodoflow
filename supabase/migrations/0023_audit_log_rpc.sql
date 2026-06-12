-- =============================================================================
-- MIGRAÇÃO 0023: RPC DE AUDITORIA (append-only, server-side)
-- Projecto: ExodoFlow AI
-- Descrição: audit_logs só tem policy de SELECT (owner/manager). A escrita tem de
--            ser feita por um RPC SECURITY DEFINER — assim o cliente nunca insere
--            directamente (não pode forjar tenant_id/actor_id) e o trilho fica
--            append-only. O tenant e o actor são derivados do JWT, não do cliente.
--
-- Segurança/privacidade: o RPC grava apenas action + entidade + metadata fornecida
-- pelo chamador. A app é responsável por NÃO colocar dados sensíveis (telefone,
-- e-mail, NIF, tokens, passwords) em p_metadata — só identificadores e contexto.
-- =============================================================================

CREATE OR REPLACE FUNCTION record_audit_log(
  p_action     TEXT,
  p_table_name TEXT  DEFAULT NULL,
  p_record_id  UUID  DEFAULT NULL,
  p_metadata   JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant UUID;
  v_actor  UUID;
  v_id     UUID;
BEGIN
  v_actor  := auth.uid();
  v_tenant := auth_tenant_id();   -- NULL para superadmin/sistema; aceitável (coluna é nullable)

  INSERT INTO audit_logs (tenant_id, actor_id, action, table_name, record_id, metadata)
  VALUES (v_tenant, v_actor, p_action, p_table_name, p_record_id, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION record_audit_log(TEXT, TEXT, UUID, JSONB) IS
  'Regista um evento de auditoria (append-only). tenant_id/actor_id vêm do JWT, nunca do cliente.';

GRANT EXECUTE ON FUNCTION record_audit_log(TEXT, TEXT, UUID, JSONB) TO authenticated;

-- Garantia append-only: sem policies de UPDATE/DELETE, e revogar essas permissões
-- directas ao authenticated (defesa em profundidade — o RPC só faz INSERT).
REVOKE UPDATE, DELETE ON audit_logs FROM authenticated;
