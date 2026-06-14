-- =============================================================================
-- 0032 — PAINEL SUPERADMIN: gestão completa (planos, feature flags, notas)
--
-- Dá ao SUPERADMIN autonomia para gerir a plataforma sem tocar em código:
--   1. plans          — CRUD completo (criar/editar/activar planos e preços)
--   2. feature_flags   — ligar/desligar funcionalidades por empresa
--   3. tenants.admin_notes — notas internas administrativas (mini-CRM)
--
-- Segurança: todas as políticas exigem auth_user_role()='superadmin'. O
-- superadmin tem tenant_id NULL, por isso as políticas tenant-scoped não se
-- aplicam — estas são globais e exclusivas do superadmin. Os GRANTs de DML para
-- authenticated já existem (migration 0031); aqui adicionam-se só as POLICIES.
-- =============================================================================


-- ── 1. PLANS — gestão completa pelo superadmin ───────────────────────────────
-- A política existente (plans_select_authenticated) só mostra is_active=true, o
-- que esconderia planos desactivados do próprio painel. Esta política adicional
-- dá ao superadmin visibilidade total + escrita.
DROP POLICY IF EXISTS "plans_select_superadmin" ON plans;
CREATE POLICY "plans_select_superadmin"
  ON plans FOR SELECT TO authenticated
  USING (auth_user_role() = 'superadmin');

DROP POLICY IF EXISTS "plans_insert_superadmin" ON plans;
CREATE POLICY "plans_insert_superadmin"
  ON plans FOR INSERT TO authenticated
  WITH CHECK (auth_user_role() = 'superadmin');

DROP POLICY IF EXISTS "plans_update_superadmin" ON plans;
CREATE POLICY "plans_update_superadmin"
  ON plans FOR UPDATE TO authenticated
  USING (auth_user_role() = 'superadmin')
  WITH CHECK (auth_user_role() = 'superadmin');

DROP POLICY IF EXISTS "plans_delete_superadmin" ON plans;
CREATE POLICY "plans_delete_superadmin"
  ON plans FOR DELETE TO authenticated
  USING (auth_user_role() = 'superadmin');


-- ── 2. FEATURE_FLAGS — gestão por empresa pelo superadmin ────────────────────
DROP POLICY IF EXISTS "feature_flags_select_superadmin" ON feature_flags;
CREATE POLICY "feature_flags_select_superadmin"
  ON feature_flags FOR SELECT TO authenticated
  USING (auth_user_role() = 'superadmin');

DROP POLICY IF EXISTS "feature_flags_insert_superadmin" ON feature_flags;
CREATE POLICY "feature_flags_insert_superadmin"
  ON feature_flags FOR INSERT TO authenticated
  WITH CHECK (auth_user_role() = 'superadmin');

DROP POLICY IF EXISTS "feature_flags_update_superadmin" ON feature_flags;
CREATE POLICY "feature_flags_update_superadmin"
  ON feature_flags FOR UPDATE TO authenticated
  USING (auth_user_role() = 'superadmin')
  WITH CHECK (auth_user_role() = 'superadmin');

DROP POLICY IF EXISTS "feature_flags_delete_superadmin" ON feature_flags;
CREATE POLICY "feature_flags_delete_superadmin"
  ON feature_flags FOR DELETE TO authenticated
  USING (auth_user_role() = 'superadmin');


-- ── 3. TENANTS — notas administrativas internas (mini-CRM) ───────────────────
-- Texto livre visível APENAS ao superadmin (a coluna não é exposta a owners
-- porque a sua política de SELECT é por linha; o conteúdo só é lido no painel
-- /admin, nunca no dashboard do tenant). Útil para registar contexto comercial.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS admin_notes TEXT;

COMMENT ON COLUMN tenants.admin_notes IS
  'Notas internas administrativas (superadmin). Não exibidas no dashboard do tenant.';
