-- =============================================================================
-- 0039 — LISTA DE ESPERA
--
-- Quando não há vaga no horário desejado, o cliente entra numa lista de espera.
-- Ao surgir um cancelamento, a equipa contacta quem está à espera para encaixar.
-- Gerida por qualquer membro da equipa do tenant (como a agenda).
-- =============================================================================

CREATE TABLE IF NOT EXISTS waitlist (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id      UUID        REFERENCES clients(id)  ON DELETE SET NULL,
  contact_name   TEXT,                                    -- usado se não houver cliente registado
  contact_phone  TEXT,
  service_id     UUID        REFERENCES services(id)  ON DELETE SET NULL,
  resource_id    UUID        REFERENCES resources(id) ON DELETE SET NULL,  -- profissional preferido
  preferred_from DATE,                                    -- disponível a partir de
  notes          TEXT,
  status         TEXT        NOT NULL DEFAULT 'waiting'
                             CHECK (status IN ('waiting', 'contacted', 'scheduled', 'cancelled')),
  created_by     UUID        REFERENCES profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- É preciso saber quem contactar: cliente registado OU nome de contacto.
  CONSTRAINT chk_waitlist_quem CHECK (client_id IS NOT NULL OR contact_name IS NOT NULL)
);

COMMENT ON TABLE waitlist IS 'Lista de espera para encaixar clientes quando surgem cancelamentos.';

CREATE INDEX IF NOT EXISTS idx_waitlist_tenant_status
  ON waitlist (tenant_id, status, created_at);

CREATE TRIGGER trigger_waitlist_updated_at
  BEFORE UPDATE ON waitlist
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS: qualquer membro da equipa do tenant gere a sua lista de espera ───────
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waitlist_select_tenant"
  ON waitlist FOR SELECT
  USING (tenant_id = auth_tenant_id());

CREATE POLICY "waitlist_insert_tenant"
  ON waitlist FOR INSERT
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY "waitlist_update_tenant"
  ON waitlist FOR UPDATE
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY "waitlist_delete_tenant"
  ON waitlist FOR DELETE
  USING (tenant_id = auth_tenant_id());
