-- =============================================================================
-- 0034 — PACOTES DE SESSÕES (client_packages)
--
-- Permite vender pacotes (ex: "10 Massagens") e descontar sessões a cada uso.
-- Comum em clínicas de estética. Tenant-scoped; consumo atómico via RPC para
-- impedir uso a mais (race). Os GRANTs de DML para authenticated são herdados
-- das DEFAULT PRIVILEGES da migração 0031.
-- =============================================================================

CREATE TABLE IF NOT EXISTS client_packages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id),
  client_id      UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_id     UUID REFERENCES services(id),        -- NULL = qualquer serviço
  name           TEXT NOT NULL,
  total_sessions INTEGER NOT NULL CHECK (total_sessions > 0),
  used_sessions  INTEGER NOT NULL DEFAULT 0 CHECK (used_sessions >= 0),
  price          NUMERIC(10,2),                        -- preço pago (opcional)
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  purchased_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at     DATE,
  created_by     UUID REFERENCES profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_used_le_total CHECK (used_sessions <= total_sessions)
);

COMMENT ON TABLE client_packages IS
  'Pacotes de sessões vendidos a um cliente (ex: 10 sessões). Desconto atómico via consumir_sessao_pacote.';

CREATE INDEX IF NOT EXISTS idx_client_packages_client ON client_packages (client_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_client_packages_tenant ON client_packages (tenant_id);

ALTER TABLE client_packages ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer membro do tenant
DROP POLICY IF EXISTS "client_packages_select_tenant" ON client_packages;
CREATE POLICY "client_packages_select_tenant"
  ON client_packages FOR SELECT TO authenticated
  USING (tenant_id = auth_tenant_id());

-- Escrita (criar/editar): front-desk do tenant (owner/manager/receptionist)
DROP POLICY IF EXISTS "client_packages_insert_tenant" ON client_packages;
CREATE POLICY "client_packages_insert_tenant"
  ON client_packages FOR INSERT TO authenticated
  WITH CHECK (tenant_id = auth_tenant_id());

DROP POLICY IF EXISTS "client_packages_update_tenant" ON client_packages;
CREATE POLICY "client_packages_update_tenant"
  ON client_packages FOR UPDATE TO authenticated
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- Apagar: só owner/manager
DROP POLICY IF EXISTS "client_packages_delete_manager" ON client_packages;
CREATE POLICY "client_packages_delete_manager"
  ON client_packages FOR DELETE TO authenticated
  USING (tenant_id = auth_tenant_id() AND auth_user_role() = ANY (ARRAY['owner', 'manager']));

CREATE TRIGGER trigger_client_packages_updated_at
  BEFORE UPDATE ON client_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ── RPC: consumir 1 sessão (atómico, impede uso a mais) ──────────────────────
CREATE OR REPLACE FUNCTION consumir_sessao_pacote(p_package_id UUID)
RETURNS client_packages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row client_packages;
BEGIN
  -- lock da linha + validação de tenant na própria query
  SELECT * INTO v_row FROM client_packages
  WHERE id = p_package_id AND tenant_id = auth_tenant_id()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pacote não encontrado';
  END IF;
  IF v_row.status <> 'active' THEN
    RAISE EXCEPTION 'Pacote não está ativo';
  END IF;
  IF v_row.used_sessions >= v_row.total_sessions THEN
    RAISE EXCEPTION 'Pacote esgotado';
  END IF;

  UPDATE client_packages
  SET used_sessions = used_sessions + 1
  WHERE id = p_package_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION consumir_sessao_pacote(UUID) IS
  'Desconta 1 sessão de um pacote (atómico). Erro se esgotado/inativo. Tenant do JWT.';

GRANT EXECUTE ON FUNCTION consumir_sessao_pacote(UUID) TO authenticated;
