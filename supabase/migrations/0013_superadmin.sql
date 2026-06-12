-- =============================================================================
-- MIGRAÇÃO 0013: ROLE SUPERADMIN + CADASTRO PRIVADO
-- Projecto: ExodoFlow AI
-- Descrição: O ExodoFlow não tem registo público nesta fase. Novos tenants e
--            owners são criados apenas pelo SUPERADMIN (administrador do
--            sistema). Esta migração:
--              1. Adiciona 'superadmin' ao CHECK de profiles.role
--              2. Torna profiles.tenant_id NULLABLE (superadmin não pertence
--                 a nenhum tenant)
--              3. Cria policies de gestão global para o superadmin
--
-- Segurança: para utilizadores normais nada muda — todas as policies
-- existentes continuam a exigir tenant_id = auth_tenant_id(). Um superadmin
-- tem tenant_id NULL, logo auth_tenant_id() devolve NULL e as policies de
-- tenant não lhe dão acesso a dados operacionais (clientes, marcações, etc.).
-- O acesso global é dado apenas às tabelas de gestão: tenants e profiles.
-- =============================================================================


-- =============================================================================
-- PASSO 1: role 'superadmin' no CHECK constraint
-- =============================================================================

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('superadmin', 'owner', 'manager', 'receptionist', 'staff'));

COMMENT ON COLUMN profiles.role IS
  'superadmin: administrador do sistema (sem tenant), owner: dono do tenant, '
  'manager: gestor operacional, receptionist: recepcionista, staff: colaborador.';


-- =============================================================================
-- PASSO 2: tenant_id NULLABLE — superadmin não pertence a nenhum tenant
-- =============================================================================

ALTER TABLE profiles ALTER COLUMN tenant_id DROP NOT NULL;

-- Garantia: apenas superadmin pode ter tenant_id NULL
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_tenant_required;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_tenant_required
  CHECK (role = 'superadmin' OR tenant_id IS NOT NULL);


-- =============================================================================
-- PASSO 3: policies de gestão global para SUPERADMIN
-- =============================================================================

-- Superadmin vê todos os tenants (lista de empresas no painel /admin)
DROP POLICY IF EXISTS "tenants_select_superadmin" ON tenants;
CREATE POLICY "tenants_select_superadmin"
  ON tenants
  FOR SELECT
  TO authenticated
  USING (auth_user_role() = 'superadmin');

-- Superadmin gere qualquer tenant: suspender/activar (is_active), definir plano
DROP POLICY IF EXISTS "tenants_update_superadmin" ON tenants;
CREATE POLICY "tenants_update_superadmin"
  ON tenants
  FOR UPDATE
  TO authenticated
  USING (auth_user_role() = 'superadmin')
  WITH CHECK (true);

-- Superadmin cria tenants directamente (painel /admin)
DROP POLICY IF EXISTS "tenants_insert_superadmin" ON tenants;
CREATE POLICY "tenants_insert_superadmin"
  ON tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_user_role() = 'superadmin');

-- Superadmin vê todos os profiles (para identificar owners de cada tenant)
DROP POLICY IF EXISTS "profiles_select_superadmin" ON profiles;
CREATE POLICY "profiles_select_superadmin"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth_user_role() = 'superadmin');

COMMENT ON POLICY "tenants_update_superadmin" ON tenants IS
  'SUPERADMIN pode suspender/activar tenants e definir o plano via painel /admin.';
