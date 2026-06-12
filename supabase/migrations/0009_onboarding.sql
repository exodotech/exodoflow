-- =============================================================================
-- MIGRAÇÃO 0009: ONBOARDING MULTI-TENANT PT/BR
-- Projecto: ExodoFlow AI
-- Descrição: Adiciona suporte ao fluxo de onboarding guiado para novos tenants.
--
-- Alterações:
--   1. tenants: country, onboarding_completed, onboarding_step
--   2. tenants.settings JSONB: locale e timezone por país
--   3. team_invites: convites de equipa (envio real marcado como "em breve")
-- =============================================================================


-- =============================================================================
-- PASSO 1: Adicionar colunas de onboarding ao tenants
-- =============================================================================

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS country          TEXT        NOT NULL DEFAULT 'PT'
    CHECK (country IN ('PT', 'BR')),
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_step  SMALLINT    NOT NULL DEFAULT 0
    CHECK (onboarding_step BETWEEN 0 AND 7);

COMMENT ON COLUMN tenants.country IS
  'País do tenant: PT (Portugal, EUR, pt-PT) ou BR (Brasil, BRL, pt-BR).';

COMMENT ON COLUMN tenants.onboarding_completed IS
  'TRUE quando o tenant completou o fluxo inicial de configuração.';

COMMENT ON COLUMN tenants.onboarding_step IS
  '0 = não iniciado; 1-6 = passo actual em curso; 7 = concluído (antes de marcar completed).';


-- =============================================================================
-- PASSO 2: Criar tabela team_invites
-- Convites de equipa — envio real de email fica como "em breve"
-- =============================================================================

CREATE TABLE IF NOT EXISTS team_invites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  role        TEXT        NOT NULL
    CHECK (role IN ('manager', 'receptionist', 'staff')),
  resource_id UUID        REFERENCES resources(id) ON DELETE SET NULL,
  status      TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  invited_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  token       TEXT        UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, email, status)
    DEFERRABLE INITIALLY DEFERRED
);

COMMENT ON TABLE team_invites IS
  'Convites de equipa enviados pelo OWNER/MANAGER. '
  'role = STAFF exige resource_id (recurso HUMAN associado). '
  'Envio real de email está marcado como "em breve".';

COMMENT ON COLUMN team_invites.token IS
  'Token único para validação do convite via link de e-mail (gerado automaticamente).';

CREATE TRIGGER trigger_team_invites_updated_at
  BEFORE UPDATE ON team_invites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_team_invites_tenant_id ON team_invites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_email     ON team_invites(email);
CREATE INDEX IF NOT EXISTS idx_team_invites_token     ON team_invites(token) WHERE token IS NOT NULL;


-- =============================================================================
-- PASSO 3: RLS para team_invites
-- =============================================================================

ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

-- SELECT: owner e manager vêem os convites do seu tenant
CREATE POLICY "team_invites_select_manager_owner"
  ON team_invites FOR SELECT TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager')
  );

-- INSERT: owner e manager podem criar convites
CREATE POLICY "team_invites_insert_manager_owner"
  ON team_invites FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager')
  );

-- UPDATE: owner e manager podem cancelar/actualizar convites
CREATE POLICY "team_invites_update_manager_owner"
  ON team_invites FOR UPDATE TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager')
  )
  WITH CHECK (tenant_id = auth_tenant_id());

-- DELETE: apenas owner
CREATE POLICY "team_invites_delete_owner"
  ON team_invites FOR DELETE TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() = 'owner'
  );


-- =============================================================================
-- PASSO 4: Actualizar seed de desenvolvimento
-- O tenant de demo já deve ser considerado como "onboarding completo"
-- =============================================================================

UPDATE tenants
SET
  country              = 'PT',
  onboarding_completed = TRUE,
  onboarding_step      = 7
WHERE id = 'b1000000-0000-0000-0000-000000000001';
