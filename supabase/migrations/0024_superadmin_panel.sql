-- =============================================================================
-- MIGRAÇÃO 0024: PAINEL SUPERADMIN — AUDITORIA SYSTEM-LEVEL + RPCs SEGUROS
-- Projecto: ExodoFlow AI
-- Descrição: Suporte ao painel /admin sem violar a privacidade dos tenants.
--   1. system_audit_logs — trilho append-only das acções do SUPERADMIN (criar/
--      suspender/reactivar tenant, alterar plano, criar owner). Separado de
--      audit_logs porque este é tenant-scoped (RLS por auth_tenant_id, que é NULL
--      no superadmin); o trilho de sistema é global e só do superadmin.
--   2. record_system_audit_log() — escreve no trilho (gated superadmin).
--   3. admin_list_tenants() — lista empresas + OWNER principal (nome/e-mail de
--      auth.users) + contagens agregadas por tenant. NUNCA devolve dados de
--      clientes/marcações; só números. Gated superadmin.
--   4. admin_tenant_metrics() — métricas globais agregadas (só contagens).
--
-- Segurança: todos os RPCs são SECURITY DEFINER mas verificam
-- auth_user_role()='superadmin' e abortam caso contrário. O e-mail exposto é o
-- do OWNER (gestão), nunca de clientes finais. Sem acesso a PII operacional.
-- =============================================================================


-- ── 1. Tabela system_audit_logs ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_audit_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_email      TEXT,
  action           TEXT NOT NULL,
  entity_type      TEXT,
  entity_id        UUID,
  target_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  description      TEXT,
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE system_audit_logs IS
  'Trilho append-only de acções administrativas do SUPERADMIN (system-level, sem tenant).';

CREATE INDEX IF NOT EXISTS idx_system_audit_created ON system_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_audit_tenant  ON system_audit_logs (target_tenant_id);

ALTER TABLE system_audit_logs ENABLE ROW LEVEL SECURITY;

-- Só o superadmin lê. Sem policies de INSERT/UPDATE/DELETE → escrita só via RPC.
DROP POLICY IF EXISTS "system_audit_select_superadmin" ON system_audit_logs;
CREATE POLICY "system_audit_select_superadmin"
  ON system_audit_logs FOR SELECT TO authenticated
  USING (auth_user_role() = 'superadmin');

-- Append-only: revogar escrita directa ao authenticated (só o RPC SECURITY DEFINER escreve)
REVOKE INSERT, UPDATE, DELETE ON system_audit_logs FROM authenticated;


-- ── 2. RPC: registar acção de sistema ────────────────────────────────────────
CREATE OR REPLACE FUNCTION record_system_audit_log(
  p_action          TEXT,
  p_entity_type     TEXT  DEFAULT NULL,
  p_entity_id       UUID  DEFAULT NULL,
  p_target_tenant_id UUID DEFAULT NULL,
  p_description     TEXT  DEFAULT NULL,
  p_metadata        JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_id    UUID;
  v_email TEXT;
BEGIN
  IF auth_user_role() <> 'superadmin' THEN
    RAISE EXCEPTION 'Apenas o superadmin pode registar auditoria de sistema';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  INSERT INTO system_audit_logs (
    actor_profile_id, actor_email, action, entity_type, entity_id,
    target_tenant_id, description, metadata
  )
  VALUES (
    auth.uid(), v_email, p_action, p_entity_type, p_entity_id,
    p_target_tenant_id, p_description, COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION record_system_audit_log(TEXT, TEXT, UUID, UUID, TEXT, JSONB) IS
  'Regista uma acção administrativa do superadmin em system_audit_logs (append-only).';

GRANT EXECUTE ON FUNCTION record_system_audit_log(TEXT, TEXT, UUID, UUID, TEXT, JSONB) TO authenticated;


-- ── 3. RPC: listar empresas + owner principal + contagens (sem PII) ───────────
CREATE OR REPLACE FUNCTION admin_list_tenants()
RETURNS TABLE (
  id                   UUID,
  name                 TEXT,
  slug                 TEXT,
  country              TEXT,
  business_type        TEXT,
  is_active            BOOLEAN,
  onboarding_completed BOOLEAN,
  plan_id              UUID,
  created_at           TIMESTAMPTZ,
  owner_id             UUID,
  owner_name           TEXT,
  owner_email          TEXT,
  owner_is_active      BOOLEAN,
  owner_created_at     TIMESTAMPTZ,
  owner_last_login     TIMESTAMPTZ,
  user_count           BIGINT,
  client_count         BIGINT,
  booking_count        BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth_user_role() <> 'superadmin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas superadmin';
  END IF;

  RETURN QUERY
  SELECT
    t.id, t.name::text, t.slug::text, t.country::text, t.business_type::text,
    t.is_active, t.onboarding_completed, t.plan_id, t.created_at,
    o.id, o.full_name::text, u.email::text, o.is_active, o.created_at, o.last_login_at,
    (SELECT count(*) FROM profiles p2 WHERE p2.tenant_id = t.id),
    (SELECT count(*) FROM clients  c  WHERE c.tenant_id  = t.id AND c.deleted_at IS NULL),
    (SELECT count(*) FROM bookings b  WHERE b.tenant_id  = t.id)
  FROM tenants t
  LEFT JOIN LATERAL (
    SELECT p.* FROM profiles p
    WHERE p.tenant_id = t.id AND p.role = 'owner'
    ORDER BY p.created_at ASC
    LIMIT 1
  ) o ON TRUE
  LEFT JOIN auth.users u ON u.id = o.id
  ORDER BY t.created_at DESC;
END;
$$;

COMMENT ON FUNCTION admin_list_tenants() IS
  'Lista empresas + owner principal (nome/e-mail) + contagens agregadas. Só superadmin. Sem PII de clientes.';

GRANT EXECUTE ON FUNCTION admin_list_tenants() TO authenticated;


-- ── 4. RPC: métricas globais agregadas (só contagens) ────────────────────────
CREATE OR REPLACE FUNCTION admin_tenant_metrics()
RETURNS TABLE (
  total_tenants     BIGINT,
  active_tenants    BIGINT,
  suspended_tenants BIGINT,
  trial_tenants     BIGINT,
  total_users       BIGINT,
  total_clients     BIGINT,
  total_bookings    BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth_user_role() <> 'superadmin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas superadmin';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM tenants),
    (SELECT count(*) FROM tenants WHERE is_active),
    (SELECT count(*) FROM tenants WHERE NOT is_active),
    (SELECT count(*) FROM tenants WHERE is_active AND plan_id IS NULL),
    (SELECT count(*) FROM profiles WHERE role <> 'superadmin'),
    (SELECT count(*) FROM clients  WHERE deleted_at IS NULL),
    (SELECT count(*) FROM bookings);
END;
$$;

COMMENT ON FUNCTION admin_tenant_metrics() IS
  'Métricas globais agregadas para o painel /admin/sistema. Só contagens, sem dados sensíveis. Só superadmin.';

GRANT EXECUTE ON FUNCTION admin_tenant_metrics() TO authenticated;
