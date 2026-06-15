-- =============================================================================
-- 0040 — AVALIAÇÕES PÓS-ATENDIMENTO
--
-- Feedback do cliente sobre um atendimento: nota de 1 a 5 + comentário.
-- Registado pela equipa (ex: ao telefone ou pessoalmente). Uma avaliação por
-- marcação. Ajuda a medir satisfação e identificar pontos a melhorar.
-- =============================================================================

CREATE TABLE IF NOT EXISTS reviews (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id   UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  booking_id  UUID        UNIQUE REFERENCES bookings(id) ON DELETE SET NULL,  -- opcional, mas única
  rating      SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_by  UUID        REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE reviews IS 'Avaliações pós-atendimento (1–5 + comentário). Registadas pela equipa.';

CREATE INDEX IF NOT EXISTS idx_reviews_tenant ON reviews (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_client ON reviews (client_id);

CREATE TRIGGER trigger_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS: qualquer membro da equipa do tenant gere as avaliações ──────────────
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_select_tenant"
  ON reviews FOR SELECT
  USING (tenant_id = auth_tenant_id());

CREATE POLICY "reviews_insert_tenant"
  ON reviews FOR INSERT
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY "reviews_update_tenant"
  ON reviews FOR UPDATE
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY "reviews_delete_tenant"
  ON reviews FOR DELETE
  USING (tenant_id = auth_tenant_id());
