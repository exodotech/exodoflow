-- =============================================================================
-- 0044 — ENDURECER anonymize_client (autorização)
--
-- A função (0003) é SECURITY DEFINER e CONFIAVA no p_tenant_id enviado pelo
-- chamador, sem verificar que o chamador pertence a esse tenant nem o seu papel.
-- Risco: um utilizador do tenant A que conheça os UUIDs podia anonimizar
-- (destrutivo, irreversível) um cliente do tenant B e revogar-lhe consentimentos;
-- e qualquer staff podia anonimizar.
--
-- Correção: para chamadas de UTILIZADOR exigir p_tenant_id = auth_tenant_id() E
-- papel 'owner'. Chamadas de SISTEMA (service_role/postgres — ex.: futura rotina
-- de retenção) continuam permitidas. Mantém a assinatura e o resto do comportamento.
-- =============================================================================

CREATE OR REPLACE FUNCTION anonymize_client(
  p_client_id UUID,
  p_tenant_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anon_suffix TEXT := LEFT(p_client_id::TEXT, 8);
  v_old_data    JSONB;
  -- Role do JWT: 'authenticated' para utilizadores; 'service_role' para o sistema
  -- (admin client). NOTA: current_user não serve aqui — numa função SECURITY
  -- DEFINER é sempre o dono (postgres); por isso discriminamos pela role do JWT.
  v_jwt_role    TEXT := COALESCE(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '');
BEGIN
  -- ── Autorização (NOVO) ─────────────────────────────────────────────────────
  -- Chamada de UTILIZADOR (role ≠ service_role): tem de ser o OWNER do PRÓPRIO
  -- tenant. Bloqueia abuso cross-tenant e escalada de staff. O sistema
  -- (service_role) é permitido para futuras rotinas de retenção.
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    IF auth_tenant_id() IS NULL OR p_tenant_id IS DISTINCT FROM auth_tenant_id() THEN
      RAISE EXCEPTION 'Sem permissão para anonimizar clientes de outro tenant';
    END IF;
    IF auth_user_role() IS DISTINCT FROM 'owner' THEN
      RAISE EXCEPTION 'Apenas o proprietário pode anonimizar um cliente';
    END IF;
  END IF;

  -- Verificar que o cliente existe, pertence ao tenant e não foi já anonimizado
  IF NOT EXISTS (
    SELECT 1 FROM clients
    WHERE id = p_client_id AND tenant_id = p_tenant_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Cliente % não encontrado ou não pertence ao tenant %', p_client_id, p_tenant_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM clients WHERE id = p_client_id AND is_anonymized = TRUE
  ) THEN
    RAISE EXCEPTION 'Cliente % já foi anonimizado anteriormente', p_client_id;
  END IF;

  -- Snapshot dos dados antes (para auditoria interna)
  SELECT jsonb_build_object(
    'full_name', full_name, 'phone', phone, 'email', email,
    'birth_date', birth_date, 'nif', nif
  ) INTO v_old_data FROM clients WHERE id = p_client_id;

  -- Substituir PII por valores anónimos
  UPDATE clients SET
    full_name     = 'Cliente Anónimo ' || v_anon_suffix,
    phone         = NULL,
    email         = NULL,
    birth_date    = NULL,
    nif           = NULL,
    notes         = NULL,
    tags          = '{}',
    is_anonymized = TRUE,
    updated_at    = NOW()
  WHERE id = p_client_id AND tenant_id = p_tenant_id;

  -- Revogar consentimentos ativos (PII removida ⇒ consentimentos obsoletos)
  UPDATE legal_consents SET revoked_at = NOW()
  WHERE client_id = p_client_id AND tenant_id = p_tenant_id AND revoked_at IS NULL;

  -- Prova de cumprimento no audit_log
  INSERT INTO audit_logs (tenant_id, actor_id, action, table_name, record_id, old_data, new_data, metadata)
  VALUES (
    p_tenant_id, auth.uid(), 'client.anonymized', 'clients', p_client_id,
    v_old_data,
    jsonb_build_object('is_anonymized', TRUE, 'full_name', 'Cliente Anónimo ' || v_anon_suffix),
    jsonb_build_object('reason', 'RGPD/LGPD — direito ao apagamento', 'anonymized_at', NOW())
  );
END;
$$;

COMMENT ON FUNCTION anonymize_client(UUID, UUID) IS
  'Remove PII de um cliente (RGPD/LGPD). Só OWNER do próprio tenant (ou sistema). Idempotente. Regista em audit_logs.';
