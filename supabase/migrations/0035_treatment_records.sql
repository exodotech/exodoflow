-- =============================================================================
-- 0035 — FICHA DE TRATAMENTO (treatment_records)
--
-- Histórico clínico por visita: notas do tratamento e produtos usados. Comum em
-- estética/saúde. Tenant-scoped. NÃO é dado de marketing — é registo operacional
-- da prestação do serviço. GRANTs de DML herdados das DEFAULT PRIVILEGES (0031).
-- =============================================================================

CREATE TABLE IF NOT EXISTS treatment_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id),
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_id   UUID REFERENCES services(id),       -- serviço associado (opcional)
  booking_id   UUID REFERENCES bookings(id) ON DELETE SET NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes        TEXT,                                -- observações do tratamento
  products     TEXT,                                -- produtos/materiais usados
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE treatment_records IS
  'Ficha de tratamento por visita (notas + produtos). Registo operacional, não marketing.';

CREATE INDEX IF NOT EXISTS idx_treatment_records_client ON treatment_records (client_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_treatment_records_tenant ON treatment_records (tenant_id);

ALTER TABLE treatment_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "treatment_records_select_tenant" ON treatment_records;
CREATE POLICY "treatment_records_select_tenant"
  ON treatment_records FOR SELECT TO authenticated
  USING (tenant_id = auth_tenant_id());

DROP POLICY IF EXISTS "treatment_records_insert_tenant" ON treatment_records;
CREATE POLICY "treatment_records_insert_tenant"
  ON treatment_records FOR INSERT TO authenticated
  WITH CHECK (tenant_id = auth_tenant_id());

DROP POLICY IF EXISTS "treatment_records_update_tenant" ON treatment_records;
CREATE POLICY "treatment_records_update_tenant"
  ON treatment_records FOR UPDATE TO authenticated
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

DROP POLICY IF EXISTS "treatment_records_delete_manager" ON treatment_records;
CREATE POLICY "treatment_records_delete_manager"
  ON treatment_records FOR DELETE TO authenticated
  USING (tenant_id = auth_tenant_id() AND auth_user_role() = ANY (ARRAY['owner', 'manager']));

CREATE TRIGGER trigger_treatment_records_updated_at
  BEFORE UPDATE ON treatment_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
