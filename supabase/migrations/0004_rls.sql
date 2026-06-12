-- =============================================================================
-- MIGRAÇÃO 0004: ROW LEVEL SECURITY (RLS)
-- Projeto: ExodoFlow AI
-- Descrição: Políticas de segurança a nível de linha para isolamento multi-tenant.
--
-- ESTRATÉGIA:
--   1. Activar RLS em todas as tabelas com tenant_id
--   2. "Deny by default" — sem política = sem acesso
--   3. Políticas lêem tenant_id do JWT via auth_tenant_id()
--   4. A service_role key do Supabase ignora RLS — NUNCA usar no browser
--   5. Políticas separadas por operação (SELECT, INSERT, UPDATE, DELETE)
--      para controlo granular
--
-- IMPORTANTE:
--   O tenant_id no JWT é definido pelo servidor durante o onboarding.
--   O utilizador não pode alterar o seu próprio app_metadata.
--   Isto garante que um utilizador nunca pode aceder a dados de outro tenant.
-- =============================================================================


-- =============================================================================
-- ACTIVAR RLS EM TODAS AS TABELAS
-- Sem isto, todas as políticas abaixo são ignoradas.
-- =============================================================================
ALTER TABLE plans                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE services                ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources               ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_availability   ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_blocks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings                ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_resources       ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_contexts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_consents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics           ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags           ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- TABELA: plans
-- Todos os utilizadores autenticados podem ler os planos (página de preços, etc.).
-- Apenas admins do sistema podem modificar (feito via service_role, não via RLS).
-- =============================================================================

-- Qualquer utilizador autenticado pode ver os planos activos
CREATE POLICY "plans_select_authenticated"
  ON plans
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

COMMENT ON POLICY "plans_select_authenticated" ON plans IS
  'Utilizadores autenticados vêem apenas planos activos. Planos inactivos são invisíveis.';


-- =============================================================================
-- TABELA: tenants
-- Utilizador só vê o seu próprio tenant (via tenant_id no JWT).
-- Nenhum utilizador pode criar/alterar tenants directamente (feito via Edge Functions).
-- =============================================================================

-- Utilizador vê apenas o seu tenant
CREATE POLICY "tenants_select_own"
  ON tenants
  FOR SELECT
  TO authenticated
  USING (
    id = auth_tenant_id()       -- o tenant_id do JWT deve corresponder ao id do tenant
    AND deleted_at IS NULL      -- tenant activo
  );

COMMENT ON POLICY "tenants_select_own" ON tenants IS
  'Utilizador vê apenas o seu tenant. tenant_id vem do JWT app_metadata — não pode ser manipulado pelo cliente.';


-- =============================================================================
-- TABELA: profiles
-- Utilizador vê apenas profiles do seu tenant.
-- Utilizador pode actualizar apenas o seu próprio profile.
-- Owners e admins podem actualizar profiles de staff do mesmo tenant.
-- =============================================================================

-- Qualquer membro do tenant pode ver todos os profiles do tenant
CREATE POLICY "profiles_select_same_tenant"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND is_active = TRUE
  );

-- Utilizador pode actualizar apenas o seu próprio profile
CREATE POLICY "profiles_update_own"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()                         -- só o próprio utilizador
    AND tenant_id = auth_tenant_id()        -- confirmação extra: mesmo tenant
  )
  WITH CHECK (
    tenant_id = auth_tenant_id()            -- impede alteração do tenant_id
  );

-- Admins e owners podem actualizar qualquer profile do seu tenant
CREATE POLICY "profiles_update_admin"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'admin')
  )
  WITH CHECK (
    tenant_id = auth_tenant_id()            -- impede mover um profile para outro tenant
  );

COMMENT ON POLICY "profiles_select_same_tenant" ON profiles IS
  'Todos os membros do tenant vêem os profiles do mesmo tenant.';
COMMENT ON POLICY "profiles_update_own" ON profiles IS
  'Cada utilizador pode editar apenas o seu próprio profile.';
COMMENT ON POLICY "profiles_update_admin" ON profiles IS
  'Owners e admins podem gerir qualquer profile do seu tenant.';


-- =============================================================================
-- TABELA: clients
-- Isolamento completo por tenant_id.
-- Excluir clientes anonimizados ou com soft delete da listagem normal.
-- =============================================================================

CREATE POLICY "clients_select_own_tenant"
  ON clients
  FOR SELECT
  TO authenticated
  USING (
    tenant_id  = auth_tenant_id()
    AND deleted_at IS NULL          -- excluir registos com soft delete
  );

CREATE POLICY "clients_insert_own_tenant"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = auth_tenant_id()    -- garante que o tenant_id inserido corresponde ao do JWT
  );

CREATE POLICY "clients_update_own_tenant"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND deleted_at IS NULL
  )
  WITH CHECK (
    tenant_id = auth_tenant_id()    -- impede alteração do tenant_id
  );

-- Soft delete: apenas owners e admins podem "apagar" clientes
CREATE POLICY "clients_delete_admin_only"
  ON clients
  FOR DELETE
  TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'admin')
  );

COMMENT ON POLICY "clients_insert_own_tenant" ON clients IS
  'WITH CHECK garante que utilizador não pode inserir com tenant_id diferente do seu.';


-- =============================================================================
-- TABELA: services
-- Isolamento por tenant_id.
-- Staff pode ler. Apenas admin/owner pode criar e modificar.
-- =============================================================================

CREATE POLICY "services_select_own_tenant"
  ON services
  FOR SELECT
  TO authenticated
  USING (
    tenant_id  = auth_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY "services_insert_admin_only"
  ON services
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "services_update_admin_only"
  ON services
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'admin')
    AND deleted_at IS NULL
  )
  WITH CHECK (
    tenant_id = auth_tenant_id()
  );

COMMENT ON POLICY "services_insert_admin_only" ON services IS
  'Apenas owners e admins podem criar/modificar serviços.';


-- =============================================================================
-- TABELA: resources
-- Isolamento por tenant_id.
-- Staff pode ler. Apenas admin/owner pode criar e modificar.
-- =============================================================================

CREATE POLICY "resources_select_own_tenant"
  ON resources
  FOR SELECT
  TO authenticated
  USING (
    tenant_id  = auth_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY "resources_insert_admin_only"
  ON resources
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "resources_update_admin_only"
  ON resources
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'admin')
    AND deleted_at IS NULL
  )
  WITH CHECK (
    tenant_id = auth_tenant_id()
  );


-- =============================================================================
-- TABELA: resource_availability
-- Isolamento por tenant_id.
-- Staff pode ler. Apenas admin/owner pode gerir horários.
-- =============================================================================

CREATE POLICY "resource_availability_select_own_tenant"
  ON resource_availability
  FOR SELECT
  TO authenticated
  USING (tenant_id = auth_tenant_id());

CREATE POLICY "resource_availability_write_admin_only"
  ON resource_availability
  FOR ALL
  TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'admin')
  )
  WITH CHECK (
    tenant_id = auth_tenant_id()
  );

COMMENT ON POLICY "resource_availability_write_admin_only" ON resource_availability IS
  'Apenas owners e admins gerem horários de disponibilidade.';


-- =============================================================================
-- TABELA: resource_blocks
-- Isolamento por tenant_id.
-- Staff pode ler e criar bloqueios. Apenas admin/owner pode apagar.
-- =============================================================================

CREATE POLICY "resource_blocks_select_own_tenant"
  ON resource_blocks
  FOR SELECT
  TO authenticated
  USING (tenant_id = auth_tenant_id());

CREATE POLICY "resource_blocks_insert_staff"
  ON resource_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = auth_tenant_id()
  );

CREATE POLICY "resource_blocks_update_own_tenant"
  ON resource_blocks
  FOR UPDATE
  TO authenticated
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY "resource_blocks_delete_admin_only"
  ON resource_blocks
  FOR DELETE
  TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'admin')
  );


-- =============================================================================
-- TABELA: bookings
-- Isolamento completo por tenant_id.
-- Todo o staff pode criar e ver marcações.
-- Cancelamento disponível para qualquer staff.
-- =============================================================================

CREATE POLICY "bookings_select_own_tenant"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (tenant_id = auth_tenant_id());

CREATE POLICY "bookings_insert_own_tenant"
  ON bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = auth_tenant_id()
  );

CREATE POLICY "bookings_update_own_tenant"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (
    tenant_id = auth_tenant_id()        -- impede que tenant_id seja alterado
  );

-- Apagar marcações é operação destrutiva — apenas admins/owners
CREATE POLICY "bookings_delete_admin_only"
  ON bookings
  FOR DELETE
  TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'admin')
  );

COMMENT ON POLICY "bookings_update_own_tenant" ON bookings IS
  'WITH CHECK impede alteração do tenant_id. Cancelamento usa UPDATE (status = cancelled).';


-- =============================================================================
-- TABELA: booking_resources
-- Isolamento por tenant_id.
-- Segue as mesmas permissões que bookings.
-- =============================================================================

CREATE POLICY "booking_resources_select_own_tenant"
  ON booking_resources
  FOR SELECT
  TO authenticated
  USING (tenant_id = auth_tenant_id());

CREATE POLICY "booking_resources_insert_own_tenant"
  ON booking_resources
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY "booking_resources_delete_own_tenant"
  ON booking_resources
  FOR DELETE
  TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'admin')
  );


-- =============================================================================
-- TABELA: whatsapp_conversations
-- Isolamento por tenant_id.
-- Staff pode ler e gerir conversas.
-- =============================================================================

CREATE POLICY "wa_conversations_select_own_tenant"
  ON whatsapp_conversations
  FOR SELECT
  TO authenticated
  USING (tenant_id = auth_tenant_id());

CREATE POLICY "wa_conversations_insert_own_tenant"
  ON whatsapp_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY "wa_conversations_update_own_tenant"
  ON whatsapp_conversations
  FOR UPDATE
  TO authenticated
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());


-- =============================================================================
-- TABELA: whatsapp_messages
-- Isolamento por tenant_id.
-- Staff pode ler e criar mensagens (enviar respostas).
-- Mensagens são imutáveis — sem UPDATE.
-- =============================================================================

CREATE POLICY "wa_messages_select_own_tenant"
  ON whatsapp_messages
  FOR SELECT
  TO authenticated
  USING (tenant_id = auth_tenant_id());

CREATE POLICY "wa_messages_insert_own_tenant"
  ON whatsapp_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = auth_tenant_id());

COMMENT ON POLICY "wa_messages_insert_own_tenant" ON whatsapp_messages IS
  'Sem UPDATE: mensagens são imutáveis por design (registo fiel da conversa).';


-- =============================================================================
-- TABELA: ai_contexts
-- Isolamento por tenant_id.
-- Apenas o sistema (via funções SECURITY DEFINER) deve escrever aqui.
-- Staff pode ler para debugging.
-- =============================================================================

CREATE POLICY "ai_contexts_select_admin"
  ON ai_contexts
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'admin')
  );

-- Sem políticas de INSERT/UPDATE para utilizadores directos
-- Escrito apenas por funções SECURITY DEFINER do motor de IA

COMMENT ON POLICY "ai_contexts_select_admin" ON ai_contexts IS
  'Apenas owners e admins vêem contextos de IA (para debugging). Escrita feita pelo sistema.';


-- =============================================================================
-- TABELA: legal_consents
-- Isolamento por tenant_id.
-- Owners e admins podem ler. Staff pode inserir (registar consentimento de novo cliente).
-- Ninguém pode apagar ou alterar (registo imutável por obrigação legal).
-- =============================================================================

CREATE POLICY "legal_consents_select_admin"
  ON legal_consents
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "legal_consents_insert_own_tenant"
  ON legal_consents
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = auth_tenant_id());

COMMENT ON POLICY "legal_consents_select_admin" ON legal_consents IS
  'Sem UPDATE/DELETE: consentimentos são imutáveis. Revogar = inserir novo registo com consented=FALSE.';


-- =============================================================================
-- TABELA: audit_logs
-- Isolamento por tenant_id.
-- Apenas owners e admins podem LER os logs do seu tenant.
-- Ninguém pode escrever directamente — apenas via funções SECURITY DEFINER.
-- =============================================================================

CREATE POLICY "audit_logs_select_admin"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'admin')
  );

-- SEM políticas de INSERT/UPDATE/DELETE para utilizadores
-- Escrito exclusivamente pelas funções: log_audit_event() e anonymize_client()

COMMENT ON POLICY "audit_logs_select_admin" ON audit_logs IS
  'Sem INSERT/UPDATE/DELETE para utilizadores. Auditoria escrita só por funções SECURITY DEFINER.';


-- =============================================================================
-- TABELA: daily_metrics
-- Isolamento por tenant_id.
-- Owners e admins podem ler as métricas do seu tenant.
-- Escrita feita por Edge Functions/jobs — sem política de escrita para utilizadores.
-- =============================================================================

CREATE POLICY "daily_metrics_select_admin"
  ON daily_metrics
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'admin')
  );

COMMENT ON POLICY "daily_metrics_select_admin" ON daily_metrics IS
  'Apenas owners e admins vêem métricas. Escrita feita por jobs/Edge Functions com service_role.';


-- =============================================================================
-- TABELA: feature_flags
-- Isolamento por tenant_id.
-- Owners podem ler as flags do seu tenant.
-- Activar/desactivar flags é feito pelo sistema (service_role), não por utilizadores.
-- =============================================================================

CREATE POLICY "feature_flags_select_owner"
  ON feature_flags
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() = 'owner'
  );

COMMENT ON POLICY "feature_flags_select_owner" ON feature_flags IS
  'Apenas owners vêem as feature flags. Modificação feita pelo sistema (service_role).';
