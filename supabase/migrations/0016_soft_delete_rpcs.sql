-- =============================================================================
-- MIGRAÇÃO 0016: RPCs DE SOFT-DELETE (serviços e recursos)
-- Projecto: ExodoFlow AI
-- Descrição: O soft-delete via UPDATE directo (set deleted_at) era bloqueado de
--            forma intrigante pela WITH CHECK da policy de UPDATE — mesmo com
--            tenant_id = auth_tenant_id() a avaliar TRUE para a linha. Em vez de
--            depender desse caminho frágil, encapsula-se a operação privilegiada
--            num RPC SECURITY DEFINER (mesmo padrão de create_booking) que faz a
--            sua própria verificação de tenant + role e marca deleted_at.
--
-- Segurança: SECURITY DEFINER bypassa o RLS, por isso a função valida
-- explicitamente que (a) há tenant na sessão, (b) o registo é do tenant do
-- utilizador, (c) o role é owner/manager. Sem isto, qualquer utilizador
-- autenticado poderia apagar registos de qualquer tenant.
-- =============================================================================

CREATE OR REPLACE FUNCTION soft_delete_service(p_id UUID)
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
  IF v_role NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'Sem permissão para apagar serviços';
  END IF;

  UPDATE services
  SET deleted_at = NOW(), is_active = FALSE
  WHERE id = p_id
    AND tenant_id = v_tenant_id     -- só do próprio tenant
    AND deleted_at IS NULL          -- não apagar duas vezes
  RETURNING id INTO v_affected;

  IF v_affected IS NULL THEN
    RAISE EXCEPTION 'Serviço não encontrado, já apagado, ou sem permissão';
  END IF;

  RETURN v_affected;
END;
$$;

COMMENT ON FUNCTION soft_delete_service IS
  'Soft-delete de serviço (deleted_at + is_active=false) com verificação de tenant e role.';

GRANT EXECUTE ON FUNCTION soft_delete_service TO authenticated;


CREATE OR REPLACE FUNCTION soft_delete_resource(p_id UUID)
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
  IF v_role NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'Sem permissão para apagar recursos';
  END IF;

  UPDATE resources
  SET deleted_at = NOW(), is_active = FALSE
  WHERE id = p_id
    AND tenant_id = v_tenant_id
    AND deleted_at IS NULL
  RETURNING id INTO v_affected;

  IF v_affected IS NULL THEN
    RAISE EXCEPTION 'Recurso não encontrado, já apagado, ou sem permissão';
  END IF;

  RETURN v_affected;
END;
$$;

COMMENT ON FUNCTION soft_delete_resource IS
  'Soft-delete de recurso (deleted_at + is_active=false) com verificação de tenant e role.';

GRANT EXECUTE ON FUNCTION soft_delete_resource TO authenticated;
