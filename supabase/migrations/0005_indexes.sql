-- =============================================================================
-- MIGRAÇÃO 0005: ÍNDICES DE PERFORMANCE
-- Projeto: ExodoFlow AI
-- Descrição: Índices para optimizar as queries mais frequentes do sistema.
--
-- ESTRATÉGIA:
--   - Todos os índices incluem tenant_id como primeiro campo (queries sempre filtram por tenant)
--   - Índices parciais (WHERE) excluem registos deletados/cancelados quando possível
--   - Índices compostos seguem a ordem: (tenant_id, campo_mais_selectivo, ...)
--   - Índice GIN para campos JSONB pesquisados frequentemente
--   - Índice GiST para campos vector (embeddings de IA)
-- =============================================================================


-- =============================================================================
-- TABELA: tenants
-- =============================================================================

-- Pesquisa de tenant por slug (usada no middleware para resolver tenant_id)
-- É a query mais frequente do sistema inteiro — executada em cada request
CREATE INDEX idx_tenants_slug
  ON tenants (slug)
  WHERE deleted_at IS NULL;

-- Listagem de tenants por plano (relatórios internos do SaaS)
CREATE INDEX idx_tenants_plan_id
  ON tenants (plan_id)
  WHERE deleted_at IS NULL;


-- =============================================================================
-- TABELA: profiles
-- =============================================================================

-- Lookup de profiles por tenant (sidebar, listagem de staff)
CREATE INDEX idx_profiles_tenant_id
  ON profiles (tenant_id)
  WHERE is_active = TRUE;

-- Lookup de profile por utilizador Auth (middleware de autenticação)
-- Combinado com tenant para verificar se o utilizador pertence ao tenant
CREATE INDEX idx_profiles_tenant_user
  ON profiles (tenant_id, id)
  WHERE is_active = TRUE;


-- =============================================================================
-- TABELA: clients
-- =============================================================================

-- Listagem de clientes por tenant (a query mais comum no módulo de clientes)
CREATE INDEX idx_clients_tenant_id
  ON clients (tenant_id, created_at DESC)
  WHERE deleted_at IS NULL AND is_anonymized = FALSE;

-- Pesquisa de cliente por número de telefone (muito frequente no fluxo WhatsApp)
CREATE INDEX idx_clients_phone
  ON clients (tenant_id, phone)
  WHERE deleted_at IS NULL AND phone IS NOT NULL;

-- Pesquisa de cliente por email
CREATE INDEX idx_clients_email
  ON clients (tenant_id, email)
  WHERE deleted_at IS NULL AND email IS NOT NULL;

-- Pesquisa full-text no nome do cliente (barra de pesquisa rápida)
-- pg_trgm permite pesquisa por substrings (ex: "ana" encontra "Ana Silva")
-- Índice GIN só em full_name (TEXT) — tenant_id é filtro WHERE, não parte do índice
CREATE INDEX idx_clients_name_trgm
  ON clients USING GIN (full_name gin_trgm_ops)
  WHERE deleted_at IS NULL AND tenant_id IS NOT NULL;


-- =============================================================================
-- TABELA: services
-- =============================================================================

-- Listagem de serviços activos por tenant (dropdown de criação de marcação)
CREATE INDEX idx_services_tenant_active
  ON services (tenant_id, sort_order)
  WHERE deleted_at IS NULL AND is_active = TRUE;


-- =============================================================================
-- TABELA: resources
-- =============================================================================

-- Listagem de recursos por tenant (dropdown de profissionais)
CREATE INDEX idx_resources_tenant_active
  ON resources (tenant_id, type)
  WHERE deleted_at IS NULL AND is_active = TRUE;

-- Lookup de recurso ligado a um profile (profissional que é também utilizador)
CREATE INDEX idx_resources_profile_id
  ON resources (tenant_id, profile_id)
  WHERE deleted_at IS NULL AND profile_id IS NOT NULL;


-- =============================================================================
-- TABELA: resource_availability
-- =============================================================================

-- Query principal de get_available_slots: filtrar por recurso e dia da semana
-- Índice composto para cobrir os dois filtros da CTE 'janelas'
CREATE INDEX idx_resource_availability_resource_dow
  ON resource_availability (resource_id, day_of_week);

-- Filtro por tenant (RLS + queries de gestão de horários)
CREATE INDEX idx_resource_availability_tenant
  ON resource_availability (tenant_id);


-- =============================================================================
-- TABELA: resource_blocks
-- =============================================================================

-- Query principal de get_available_slots: verificar bloqueios por recurso e período
-- Cobre o filtro da CTE 'bloqueios': resource_id + start_at + end_at
CREATE INDEX idx_resource_blocks_resource_period
  ON resource_blocks (resource_id, start_at, end_at);

-- Filtro por tenant
CREATE INDEX idx_resource_blocks_tenant
  ON resource_blocks (tenant_id);


-- =============================================================================
-- TABELA: bookings
-- =============================================================================

-- Vista de calendário: marcações de um tenant por data (query mais comum do dashboard)
CREATE INDEX idx_bookings_tenant_period
  ON bookings (tenant_id, start_at, end_at)
  WHERE status != 'cancelled';

-- Listagem de marcações por cliente (histórico do cliente)
CREATE INDEX idx_bookings_client
  ON bookings (tenant_id, client_id, start_at DESC);

-- Filtro por status (lista de marcações pendentes, confirmadas, etc.)
CREATE INDEX idx_bookings_status
  ON bookings (tenant_id, status, start_at);

-- Filtro por serviço (relatórios de desempenho por serviço)
CREATE INDEX idx_bookings_service
  ON bookings (tenant_id, service_id)
  WHERE status != 'cancelled';


-- =============================================================================
-- TABELA: booking_resources
-- =============================================================================

-- Lookup de recursos de uma marcação (carregamento da vista de detalhe)
CREATE INDEX idx_booking_resources_booking
  ON booking_resources (booking_id);

-- Query crítica de get_available_slots: verificar bookings por recurso
-- Cobre o JOIN da CTE 'ocupados': resource_id para filtrar por recurso
CREATE INDEX idx_booking_resources_resource
  ON booking_resources (resource_id, tenant_id);

-- Filtro por tenant
CREATE INDEX idx_booking_resources_tenant
  ON booking_resources (tenant_id);


-- =============================================================================
-- TABELA: whatsapp_conversations
-- =============================================================================

-- Inbox de conversas por tenant (lista de conversas ordenada por última mensagem)
CREATE INDEX idx_wa_conversations_tenant_last
  ON whatsapp_conversations (tenant_id, last_message_at DESC);

-- Lookup de conversa por número de telefone (quando chega mensagem nova)
-- A query mais frequente no fluxo de recepção de mensagens
CREATE INDEX idx_wa_conversations_phone
  ON whatsapp_conversations (tenant_id, wa_phone_number);

-- Lookup de conversas por cliente identificado
CREATE INDEX idx_wa_conversations_client
  ON whatsapp_conversations (tenant_id, client_id)
  WHERE client_id IS NOT NULL;

-- Filtro por status (conversas activas, aguardando, resolvidas)
CREATE INDEX idx_wa_conversations_status
  ON whatsapp_conversations (tenant_id, status);


-- =============================================================================
-- TABELA: whatsapp_messages
-- =============================================================================

-- Carregamento de mensagens de uma conversa (vista de chat)
CREATE INDEX idx_wa_messages_conversation
  ON whatsapp_messages (conversation_id, created_at ASC);

-- Filtro por tenant (queries administrativas)
CREATE INDEX idx_wa_messages_tenant
  ON whatsapp_messages (tenant_id, created_at DESC);

-- Lookup por wa_message_id (deduplicação — evitar processar o mesmo webhook duas vezes)
CREATE INDEX idx_wa_messages_wa_id
  ON whatsapp_messages (tenant_id, wa_message_id)
  WHERE wa_message_id IS NOT NULL;


-- =============================================================================
-- TABELA: ai_contexts
-- =============================================================================

-- Lookup de contexto por conversa (o mais frequente no motor de IA)
CREATE INDEX idx_ai_contexts_conversation
  ON ai_contexts (conversation_id);

-- Índice GiST para pesquisa por similaridade de vector (RAG futuro)
-- Permite encontrar contextos semelhantes via embedding
CREATE INDEX idx_ai_contexts_embedding
  ON ai_contexts USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100)
  WHERE embedding IS NOT NULL;


-- =============================================================================
-- TABELA: legal_consents
-- =============================================================================

-- Lookup de consentimentos por cliente (para verificar consentimentos activos)
CREATE INDEX idx_legal_consents_client
  ON legal_consents (tenant_id, client_id, consent_type);

-- Consentimentos activos (sem revogação)
CREATE INDEX idx_legal_consents_active
  ON legal_consents (tenant_id, client_id)
  WHERE revoked_at IS NULL AND consented = TRUE;


-- =============================================================================
-- TABELA: audit_logs
-- =============================================================================

-- Listagem de logs por tenant (página de auditoria no dashboard)
CREATE INDEX idx_audit_logs_tenant
  ON audit_logs (tenant_id, created_at DESC);

-- Lookup de logs por registo específico (histórico de alterações de uma marcação)
CREATE INDEX idx_audit_logs_record
  ON audit_logs (table_name, record_id, created_at DESC);

-- Lookup de acções por actor (o que fez um utilizador específico)
CREATE INDEX idx_audit_logs_actor
  ON audit_logs (actor_id, created_at DESC)
  WHERE actor_id IS NOT NULL;

-- Filtro por tipo de acção
CREATE INDEX idx_audit_logs_action
  ON audit_logs (tenant_id, action, created_at DESC);


-- =============================================================================
-- TABELA: daily_metrics
-- =============================================================================

-- Lookup de métricas por tenant e período (gráficos do dashboard)
CREATE INDEX idx_daily_metrics_tenant_date
  ON daily_metrics (tenant_id, date DESC);


-- =============================================================================
-- TABELA: feature_flags
-- =============================================================================

-- Lookup de uma flag específica por tenant (o mais frequente — chamado em cada request)
CREATE INDEX idx_feature_flags_tenant_flag
  ON feature_flags (tenant_id, flag_name);
