-- =============================================================================
-- MIGRAÇÃO 0008: ROLES E PERMISSÕES
-- Projecto: ExodoFlow AI
-- Descrição: Implementa controlo granular de acesso por role.
--
-- Roles introduzidas:
--   owner       — acesso total; 1 por tenant
--   manager     — agenda, clientes, serviços, recursos, relatórios (ex-admin)
--   receptionist — agenda, clientes, conversas
--   staff       — apenas a própria agenda + alterar status das suas marcações
--
-- Estratégia de segurança:
--   1. RLS é a linha de defesa real — o frontend é apenas UX
--   2. Policies separadas por role e operação para controlo granular
--   3. STAFF vê apenas bookings ligados ao seu recurso (profile_id em resources)
--   4. Sem UPDATE/DELETE para utilizadores em tabelas de auditoria
-- =============================================================================


-- =============================================================================
-- PASSO 1: Actualizar CHECK constraint de profiles.role
-- Adicionar manager e receptionist; remover viewer
-- =============================================================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'manager', 'receptionist', 'staff'));

COMMENT ON COLUMN profiles.role IS
  'owner: dono (1 por tenant), manager: gestor operacional (ex-admin), '
  'receptionist: recepcionista (agenda+clientes+conversas), staff: colaborador (agenda própria).';


-- =============================================================================
-- PASSO 2: Migração de dados — renomear roles existentes
-- admin → manager (equivalência funcional)
-- viewer → receptionist (role mais próxima)
-- =============================================================================
UPDATE profiles SET role = 'manager' WHERE role = 'admin';
UPDATE profiles SET role = 'receptionist' WHERE role = 'viewer';


-- =============================================================================
-- PASSO 3: Adicionar profile_id em resources
-- Liga cada recurso de tipo 'staff' ao profile do colaborador.
-- Usado pela policy RLS de STAFF para filtrar apenas as suas marcações.
-- NULL = recurso sem colaborador atribuído (salas, equipamentos)
-- =============================================================================
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN resources.profile_id IS
  'Colaborador associado a este recurso. Usado para filtrar bookings visíveis ao STAFF. '
  'NULL = recurso não atribuído (sala, equipamento, staff genérico).';

CREATE INDEX IF NOT EXISTS idx_resources_profile_id ON resources(profile_id) WHERE profile_id IS NOT NULL;


-- =============================================================================
-- PASSO 4: Actualizar função auth_user_role() — sem alterações necessárias
-- A função já lê role de profiles WHERE id = auth.uid()
-- Com a migração de dados acima, devolve automaticamente os novos nomes
-- =============================================================================


-- =============================================================================
-- PASSO 5: Actualizar políticas RLS que referenciam 'admin'
-- Estratégia: DROP + CREATE (PostgreSQL não permite ALTER POLICY com USING)
-- =============================================================================


-- ─── TABELA: profiles ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;

CREATE POLICY "profiles_update_manager"
  ON profiles FOR UPDATE TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager')
  )
  WITH CHECK (tenant_id = auth_tenant_id());

COMMENT ON POLICY "profiles_update_manager" ON profiles IS
  'Owners e managers podem gerir qualquer profile do seu tenant.';


-- ─── TABELA: clients ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "clients_delete_admin_only" ON clients;

-- Apenas owner e manager podem eliminar (soft-delete) clientes
-- STAFF: não pode apagar clientes (spec explícita)
-- RECEPTIONIST: pode ver/criar/actualizar mas não apagar
CREATE POLICY "clients_delete_manager_owner"
  ON clients FOR DELETE TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager')
  );

COMMENT ON POLICY "clients_delete_manager_owner" ON clients IS
  'Apenas owner e manager podem eliminar clientes. STAFF e RECEPTIONIST não têm acesso a DELETE.';


-- ─── TABELA: services ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "services_insert_admin_only" ON services;
DROP POLICY IF EXISTS "services_update_admin_only" ON services;

CREATE POLICY "services_insert_manager_owner"
  ON services FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager')
  );

CREATE POLICY "services_update_manager_owner"
  ON services FOR UPDATE TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager')
    AND deleted_at IS NULL
  )
  WITH CHECK (tenant_id = auth_tenant_id());

COMMENT ON POLICY "services_insert_manager_owner" ON services IS
  'Apenas owner e manager podem criar/modificar serviços.';


-- ─── TABELA: resources ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "resources_insert_admin_only" ON resources;
DROP POLICY IF EXISTS "resources_update_admin_only" ON resources;

CREATE POLICY "resources_insert_manager_owner"
  ON resources FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager')
  );

CREATE POLICY "resources_update_manager_owner"
  ON resources FOR UPDATE TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager')
    AND deleted_at IS NULL
  )
  WITH CHECK (tenant_id = auth_tenant_id());


-- ─── TABELA: resource_availability ───────────────────────────────────────────

DROP POLICY IF EXISTS "resource_availability_write_admin_only" ON resource_availability;

CREATE POLICY "resource_availability_write_manager_owner"
  ON resource_availability FOR ALL TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager')
  )
  WITH CHECK (tenant_id = auth_tenant_id());


-- ─── TABELA: resource_blocks ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "resource_blocks_delete_admin_only" ON resource_blocks;

CREATE POLICY "resource_blocks_delete_manager_owner"
  ON resource_blocks FOR DELETE TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager')
  );


-- ─── TABELA: bookings ─────────────────────────────────────────────────────────
-- Estratégia por role:
--   owner/manager/receptionist — vêem e gerem todas as marcações do tenant
--   staff                      — vêem apenas as marcações dos seus recursos (profile_id)

DROP POLICY IF EXISTS "bookings_select_own_tenant"    ON bookings;
DROP POLICY IF EXISTS "bookings_insert_own_tenant"    ON bookings;
DROP POLICY IF EXISTS "bookings_update_own_tenant"    ON bookings;
DROP POLICY IF EXISTS "bookings_delete_admin_only"    ON bookings;

-- SELECT: owner/manager/receptionist vêem tudo; STAFF apenas as suas
CREATE POLICY "bookings_select_non_staff"
  ON bookings FOR SELECT TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager', 'receptionist')
  );

CREATE POLICY "bookings_select_staff_own_resource"
  ON bookings FOR SELECT TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() = 'staff'
    AND EXISTS (
      SELECT 1
      FROM   booking_resources br
      INNER JOIN resources r ON r.id = br.resource_id
      WHERE  br.booking_id = bookings.id
        AND  r.profile_id  = auth.uid()
        AND  r.tenant_id   = auth_tenant_id()
    )
  );

-- INSERT: apenas owner/manager/receptionist criam marcações
-- STAFF não cria marcações — apenas gere as existentes (status)
CREATE POLICY "bookings_insert_non_staff"
  ON bookings FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager', 'receptionist')
  );

-- UPDATE: owner/manager/receptionist actualizam qualquer marcação do tenant
CREATE POLICY "bookings_update_non_staff"
  ON bookings FOR UPDATE TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager', 'receptionist')
  )
  WITH CHECK (tenant_id = auth_tenant_id());

-- UPDATE: STAFF só actualiza status das suas próprias marcações
CREATE POLICY "bookings_update_staff_own_resource"
  ON bookings FOR UPDATE TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() = 'staff'
    AND EXISTS (
      SELECT 1
      FROM   booking_resources br
      INNER JOIN resources r ON r.id = br.resource_id
      WHERE  br.booking_id = bookings.id
        AND  r.profile_id  = auth.uid()
        AND  r.tenant_id   = auth_tenant_id()
    )
  )
  WITH CHECK (tenant_id = auth_tenant_id());

-- DELETE: apenas owner e manager podem apagar marcações
CREATE POLICY "bookings_delete_manager_owner"
  ON bookings FOR DELETE TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager')
  );

COMMENT ON POLICY "bookings_select_staff_own_resource" ON bookings IS
  'STAFF vê apenas marcações ligadas ao seu recurso via resources.profile_id = auth.uid().';
COMMENT ON POLICY "bookings_update_staff_own_resource" ON bookings IS
  'STAFF só actualiza status das suas marcações. A restrição a apenas o campo status é enforced na UI.';


-- ─── TABELA: booking_resources ────────────────────────────────────────────────

DROP POLICY IF EXISTS "booking_resources_insert_own_tenant"  ON booking_resources;
DROP POLICY IF EXISTS "booking_resources_delete_own_tenant"  ON booking_resources;

-- INSERT: apenas quem pode criar bookings pode associar recursos
CREATE POLICY "booking_resources_insert_non_staff"
  ON booking_resources FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager', 'receptionist')
  );

-- DELETE: apenas owner e manager
CREATE POLICY "booking_resources_delete_manager_owner"
  ON booking_resources FOR DELETE TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager')
  );


-- ─── TABELA: whatsapp_conversations ──────────────────────────────────────────
-- STAFF não tem acesso a conversas (spec: RECEPTIONIST tem, STAFF não)

DROP POLICY IF EXISTS "wa_conversations_select_own_tenant"  ON whatsapp_conversations;
DROP POLICY IF EXISTS "wa_conversations_insert_own_tenant"  ON whatsapp_conversations;
DROP POLICY IF EXISTS "wa_conversations_update_own_tenant"  ON whatsapp_conversations;

CREATE POLICY "wa_conversations_select_roles"
  ON whatsapp_conversations FOR SELECT TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager', 'receptionist')
  );

CREATE POLICY "wa_conversations_insert_roles"
  ON whatsapp_conversations FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager', 'receptionist')
  );

CREATE POLICY "wa_conversations_update_roles"
  ON whatsapp_conversations FOR UPDATE TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager', 'receptionist')
  )
  WITH CHECK (tenant_id = auth_tenant_id());


-- ─── TABELA: whatsapp_messages ────────────────────────────────────────────────

DROP POLICY IF EXISTS "wa_messages_select_own_tenant"  ON whatsapp_messages;
DROP POLICY IF EXISTS "wa_messages_insert_own_tenant"  ON whatsapp_messages;

CREATE POLICY "wa_messages_select_roles"
  ON whatsapp_messages FOR SELECT TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager', 'receptionist')
  );

CREATE POLICY "wa_messages_insert_roles"
  ON whatsapp_messages FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager', 'receptionist')
  );


-- ─── TABELA: ai_contexts ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "ai_contexts_select_admin" ON ai_contexts;

CREATE POLICY "ai_contexts_select_manager_owner"
  ON ai_contexts FOR SELECT TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager')
  );


-- ─── TABELA: legal_consents ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "legal_consents_select_admin" ON legal_consents;

-- Owner e manager lêem consentimentos; todos (incluindo receptionist) podem inserir
CREATE POLICY "legal_consents_select_manager_owner"
  ON legal_consents FOR SELECT TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager')
  );


-- ─── TABELA: audit_logs ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS "audit_logs_select_admin" ON audit_logs;

CREATE POLICY "audit_logs_select_manager_owner"
  ON audit_logs FOR SELECT TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager')
  );


-- ─── TABELA: daily_metrics ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "daily_metrics_select_admin" ON daily_metrics;

CREATE POLICY "daily_metrics_select_manager_owner"
  ON daily_metrics FOR SELECT TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager')
  );


-- ─── TABELAS: communication_channels / communication_templates / communication_logs ──

-- Channels e templates: manager/owner gerem; receptionist lê
DROP POLICY IF EXISTS "tenant_isolation_channels"  ON communication_channels;
DROP POLICY IF EXISTS "tenant_isolation_templates" ON communication_templates;
DROP POLICY IF EXISTS "tenant_isolation_logs_select" ON communication_logs;
DROP POLICY IF EXISTS "tenant_isolation_logs_insert" ON communication_logs;

CREATE POLICY "comm_channels_select"
  ON communication_channels FOR SELECT TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager', 'receptionist')
  );

CREATE POLICY "comm_channels_write_manager_owner"
  ON communication_channels FOR ALL TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager')
  )
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY "comm_templates_select"
  ON communication_templates FOR SELECT TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager', 'receptionist')
  );

CREATE POLICY "comm_templates_write_manager_owner"
  ON communication_templates FOR ALL TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager')
  )
  WITH CHECK (tenant_id = auth_tenant_id());

-- Logs: todos podem inserir (para registo de comunicações); manager/owner lêem
CREATE POLICY "comm_logs_select_manager_owner"
  ON communication_logs FOR SELECT TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager', 'receptionist')
  );

CREATE POLICY "comm_logs_insert"
  ON communication_logs FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager', 'receptionist')
  );


-- =============================================================================
-- PASSO 6: Actualizar seed para ambiente de desenvolvimento
-- O utilizador de teste (admin@clinica-aurora.pt) era 'admin' → agora 'manager'
-- já foi actualizado pelo UPDATE acima.
-- Para testar com role OWNER em dev, actualizar manualmente:
--   UPDATE profiles SET role = 'owner' WHERE tenant_id = 'b1000000-...' LIMIT 1;
-- =============================================================================

-- Garantir que o profile de seed tem role = 'owner' (não apenas manager)
-- O utilizador criado via `supabase db reset` deve ser o owner do tenant
UPDATE profiles
SET    role = 'owner'
WHERE  tenant_id = 'b1000000-0000-0000-0000-000000000001'
  AND  role IN ('manager', 'admin');
