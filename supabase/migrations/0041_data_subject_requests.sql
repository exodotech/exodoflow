-- =============================================================================
-- 0041 — PEDIDOS DE TITULARES DE DADOS (LGPD/RGPD)
--
-- Estrutura para REGISTAR e ACOMPANHAR pedidos de titulares (acesso, correção,
-- exclusão, anonimização, exportação, restrição, oposição). Cada empresa cliente
-- (tenant) gere os pedidos dos SEUS titulares (equipa e clientes finais).
--
-- Nota: tabela de REGISTO/rastreio do processo — não automatiza a execução do
-- pedido. A execução (ex.: anonimizar um cliente) é feita pelos fluxos próprios,
-- sob decisão do controlador, e auditada. UI completa fica para roadmap.
-- =============================================================================

CREATE TABLE IF NOT EXISTS data_subject_requests (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  requester_name    TEXT        NOT NULL,
  requester_email   TEXT,
  request_type      TEXT        NOT NULL CHECK (request_type IN (
                      'acesso', 'correcao', 'exclusao', 'anonimizacao',
                      'exportacao', 'restricao', 'oposicao')),
  -- titular alvo, quando é um perfil/cliente identificável no sistema (opcional)
  target_profile_id UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  target_client_id  UUID        REFERENCES clients(id)  ON DELETE SET NULL,
  status            TEXT        NOT NULL DEFAULT 'received' CHECK (status IN (
                      'received', 'in_progress', 'completed', 'rejected')),
  received_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at       TIMESTAMPTZ,
  handled_by        UUID        REFERENCES profiles(id),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE data_subject_requests IS 'Registo e acompanhamento de pedidos de titulares (LGPD/RGPD), por tenant.';

CREATE INDEX IF NOT EXISTS idx_dsr_tenant_status ON data_subject_requests (tenant_id, status, received_at DESC);

CREATE TRIGGER trigger_dsr_updated_at
  BEFORE UPDATE ON data_subject_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS: pedidos são sensíveis → só owner/manager do tenant ──────────────────
ALTER TABLE data_subject_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dsr_select_owner_manager"
  ON data_subject_requests FOR SELECT
  USING (tenant_id = auth_tenant_id() AND auth_user_role() IN ('owner', 'manager'));

CREATE POLICY "dsr_insert_owner_manager"
  ON data_subject_requests FOR INSERT
  WITH CHECK (tenant_id = auth_tenant_id() AND auth_user_role() IN ('owner', 'manager'));

CREATE POLICY "dsr_update_owner_manager"
  ON data_subject_requests FOR UPDATE
  USING (tenant_id = auth_tenant_id() AND auth_user_role() IN ('owner', 'manager'))
  WITH CHECK (tenant_id = auth_tenant_id() AND auth_user_role() IN ('owner', 'manager'));
-- Sem DELETE: pedidos são registo de processo (mantêm-se para prova de tratamento).
