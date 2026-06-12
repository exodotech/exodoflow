-- =============================================================================
-- MIGRAÇÃO 0017: RPC DE SOFT-DELETE DE CLIENTE
-- Projecto: ExodoFlow AI
-- Descrição: Mesmo padrão de 0016 (serviços/recursos). O soft-delete via UPDATE
--            directo de deleted_at é bloqueado pela RLS; encapsula-se num RPC
--            SECURITY DEFINER que valida tenant + role antes de marcar deleted_at.
--
-- NOTA: isto NÃO é o "direito ao esquecimento" RGPD — para apagar os dados
-- pessoais existe anonymize_client(). soft_delete_client apenas remove o cliente
-- da lista operacional, preservando o histórico de marcações.
-- =============================================================================

CREATE OR REPLACE FUNCTION soft_delete_client(p_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID := auth_tenant_id();
  v_role      TEXT := auth_user_role();
  v_affected  UUID;
BEGIN
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant não identificado na sessão';
  END IF;
  -- Apagar clientes é restrito a owner/manager (igual à policy de DELETE)
  IF v_role NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'Sem permissão para apagar clientes';
  END IF;

  UPDATE clients
  SET deleted_at = NOW()
  WHERE id = p_id
    AND tenant_id = v_tenant_id
    AND deleted_at IS NULL
  RETURNING id INTO v_affected;

  IF v_affected IS NULL THEN
    RAISE EXCEPTION 'Cliente não encontrado, já apagado, ou sem permissão';
  END IF;

  RETURN v_affected;
END;
$$;

COMMENT ON FUNCTION soft_delete_client IS
  'Soft-delete de cliente (deleted_at) com verificação de tenant e role. Não anonimiza (ver anonymize_client).';

GRANT EXECUTE ON FUNCTION soft_delete_client TO authenticated;
