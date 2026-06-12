-- =============================================================================
-- MIGRAÇÃO 0002: TABELAS PRINCIPAIS
-- Projeto: ExodoFlow AI
-- Descrição: Cria todas as tabelas do sistema na ordem correcta de dependência.
--            Cada tabela tem tenant_id onde aplicável para isolamento multi-tenant.
--            Todos os timestamps usam TIMESTAMPTZ e são guardados em UTC.
-- =============================================================================


-- =============================================================================
-- FUNÇÃO AUXILIAR: update_updated_at_column
-- Criada aqui porque os triggers abaixo dependem dela.
-- Actualiza automaticamente o campo updated_at antes de qualquer UPDATE.
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Define updated_at como o momento actual em UTC
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- =============================================================================
-- TABELA: plans
-- Planos de subscrição disponíveis no SaaS (Free, Starter, Pro, Enterprise).
-- Não tem tenant_id porque é uma tabela global do sistema.
-- =============================================================================
CREATE TABLE IF NOT EXISTS plans (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT        NOT NULL,
  slug               TEXT        NOT NULL UNIQUE,          -- identificador URL: 'free', 'starter', 'pro'
  price_monthly      NUMERIC(10,2),                        -- preço mensal em EUR (NULL = gratuito)
  price_yearly       NUMERIC(10,2),                        -- preço anual com desconto
  max_resources      INTEGER,                              -- máximo de recursos (NULL = ilimitado)
  max_clients        INTEGER,                              -- máximo de clientes (NULL = ilimitado)
  max_bookings_month INTEGER,                              -- máximo de marcações por mês
  features           JSONB       NOT NULL DEFAULT '{}',    -- funcionalidades incluídas: {"whatsapp": true, "ai": false}
  is_active          BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order         INTEGER     NOT NULL DEFAULT 0,       -- ordem de exibição na página de preços
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentário de tabela para documentação
COMMENT ON TABLE plans IS 'Planos de subscrição do SaaS. Tabela global, sem tenant_id.';


-- =============================================================================
-- TABELA: tenants
-- Representa cada negócio cliente do SaaS (cada clínica, barbearia, etc.).
-- É a raiz de toda a hierarquia multi-tenant.
-- =============================================================================
CREATE TABLE IF NOT EXISTS tenants (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id          UUID        REFERENCES plans(id),
  name             TEXT        NOT NULL,
  slug             TEXT        NOT NULL UNIQUE,            -- usado na URL: exodoflow.ai/app/clinica-aurora
  business_type    TEXT        NOT NULL
                               CHECK (business_type IN (
                                 'estetica', 'veterinaria', 'barbearia',
                                 'dentista', 'oficina', 'fisioterapia', 'outro'
                               )),
  phone            TEXT,
  email            TEXT,
  address          JSONB,                                  -- { "street": "...", "city": "Lisboa", "country": "PT" }
  settings         JSONB       NOT NULL DEFAULT '{}',      -- { "timezone": "Europe/Lisbon", "currency": "EUR", "slot_interval_minutes": 15 }
  logo_url         TEXT,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  trial_ends_at    TIMESTAMPTZ,                            -- data de fim do período experimental
  plan_started_at  TIMESTAMPTZ,                            -- data de início do plano actual
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ                             -- soft delete: tenant desactivado mas dados preservados
);

CREATE TRIGGER trigger_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE tenants IS 'Cada linha representa um negócio cliente do SaaS. Raiz do modelo multi-tenant.';
COMMENT ON COLUMN tenants.slug IS 'Identificador único na URL. Ex: clinica-aurora. Gerado no onboarding.';
COMMENT ON COLUMN tenants.settings IS 'Configurações específicas do negócio: timezone, moeda, intervalo de slots, etc.';


-- =============================================================================
-- TABELA: profiles
-- Utilizadores internos do negócio (dono, administrador, staff).
-- Ligada à tabela auth.users do Supabase (gerida pelo sistema de autenticação).
-- =============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   UUID        NOT NULL REFERENCES tenants(id),
  role        TEXT        NOT NULL DEFAULT 'staff'
                          CHECK (role IN ('owner', 'admin', 'staff')),
  full_name   TEXT,
  avatar_url  TEXT,
  phone       TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE profiles IS 'Utilizadores internos (staff) de cada tenant. Espelha auth.users com dados de negócio.';
COMMENT ON COLUMN profiles.role IS 'owner: dono (1 por tenant), admin: gestor, staff: funcionário básico.';


-- =============================================================================
-- TABELA: clients
-- Clientes finais de cada negócio (quem marca a consulta, o corte, etc.).
-- Contém campos RGPD/LGPD obrigatórios por lei.
-- =============================================================================
CREATE TABLE IF NOT EXISTS clients (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id),
  full_name         TEXT        NOT NULL,
  phone             TEXT,
  email             TEXT,
  birth_date        DATE,
  nif               TEXT,                                  -- NIF (Portugal) / CPF (Brasil) — dado sensível
  notes             TEXT,                                  -- notas internas do staff
  tags              TEXT[]      NOT NULL DEFAULT '{}',     -- etiquetas: ["vip", "alergia-latex"]
  is_anonymized     BOOLEAN     NOT NULL DEFAULT FALSE,    -- true após anonimização RGPD
  gdpr_consent_at   TIMESTAMPTZ,                          -- data de consentimento RGPD/LGPD
  marketing_consent BOOLEAN     NOT NULL DEFAULT FALSE,    -- consentimento para comunicações de marketing
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ                            -- soft delete: cliente removido mas histórico preservado
);

CREATE TRIGGER trigger_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE clients IS 'Clientes finais de cada tenant. Contém dados pessoais sujeitos a RGPD/LGPD.';
COMMENT ON COLUMN clients.nif IS 'Número de identificação fiscal. Dado sensível — anonimizado em pedidos RGPD.';
COMMENT ON COLUMN clients.is_anonymized IS 'TRUE após execução de anonymize_client(). Impede recuperação de dados pessoais.';


-- =============================================================================
-- TABELA: services
-- Serviços oferecidos pelo negócio (ex: "Limpeza de Pele", "Massagem").
-- A duração é obrigatória pois determina o tamanho do slot na agenda.
-- =============================================================================
CREATE TABLE IF NOT EXISTS services (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID        NOT NULL REFERENCES tenants(id),
  name                    TEXT        NOT NULL,
  description             TEXT,
  duration_minutes        INTEGER     NOT NULL CHECK (duration_minutes > 0),
  price                   NUMERIC(10,2) CHECK (price >= 0),
  color                   TEXT        NOT NULL DEFAULT '#6366f1', -- cor no calendário (hex)
  is_active               BOOLEAN     NOT NULL DEFAULT TRUE,
  requires_resource_type  TEXT        CHECK (requires_resource_type IN ('staff', 'room', 'equipment', NULL)),
  metadata                JSONB       NOT NULL DEFAULT '{}',  -- campos específicos por nicho
  sort_order              INTEGER     NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ
);

CREATE TRIGGER trigger_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE services IS 'Catálogo de serviços de cada tenant. A duração determina o tamanho do slot na agenda.';
COMMENT ON COLUMN services.metadata IS 'Campos específicos por nicho de negócio. Ex veterinária: {"species": ["cão", "gato"]}.';


-- =============================================================================
-- TABELA: resources
-- Recursos reserváveis: profissionais, salas, equipamentos.
-- Um profissional é um resource do tipo "staff" ligado a um profile.
-- Separado de profiles porque nem todo o recurso é um utilizador do sistema.
-- =============================================================================
CREATE TABLE IF NOT EXISTS resources (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id),
  profile_id  UUID        REFERENCES profiles(id),         -- ligado a um utilizador se for profissional
  name        TEXT        NOT NULL,
  type        TEXT        NOT NULL
                          CHECK (type IN ('staff', 'room', 'equipment')),
  description TEXT,
  avatar_url  TEXT,
  color       TEXT        NOT NULL DEFAULT '#6366f1',
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  metadata    JSONB       NOT NULL DEFAULT '{}',           -- ex: {"specializations": ["facial", "corporal"]}
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE TRIGGER trigger_resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE resources IS 'Recursos reserváveis: profissionais, salas, equipamentos. Ligados a marcações via booking_resources.';
COMMENT ON COLUMN resources.profile_id IS 'Preenchido apenas quando o recurso é um profissional com acesso ao sistema.';


-- =============================================================================
-- TABELA: resource_availability
-- Horários de trabalho regulares de cada recurso por dia da semana.
-- Os horários são armazenados como TIME (hora local) sem timezone.
-- A conversão para UTC é feita pela função get_available_slots usando o timezone do tenant.
-- =============================================================================
CREATE TABLE IF NOT EXISTS resource_availability (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID    NOT NULL REFERENCES tenants(id),
  resource_id  UUID    NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=domingo, 6=sábado
  start_time   TIME    NOT NULL,                                      -- hora de início no timezone do tenant
  end_time     TIME    NOT NULL,                                      -- hora de fim no timezone do tenant
  valid_from   DATE,                                                  -- NULL = sempre válido desde o início
  valid_until  DATE,                                                  -- NULL = sempre válido sem fim
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Garante que o horário de fim é sempre depois do início
  CONSTRAINT chk_availability_time_range CHECK (end_time > start_time)
);

CREATE TRIGGER trigger_resource_availability_updated_at
  BEFORE UPDATE ON resource_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE resource_availability IS 'Horários de trabalho regulares por recurso e dia da semana.';
COMMENT ON COLUMN resource_availability.day_of_week IS '0=domingo, 1=segunda, 2=terça, 3=quarta, 4=quinta, 5=sexta, 6=sábado.';
COMMENT ON COLUMN resource_availability.start_time IS 'Hora local do tenant (sem timezone). Convertida para UTC em get_available_slots.';


-- =============================================================================
-- TABELA: resource_blocks
-- Bloqueios pontuais de um recurso (férias, formação, equipamento avariado, etc.).
-- Usa TIMESTAMPTZ porque são datas/horas concretas, não horários recorrentes.
-- Tem prioridade sobre resource_availability.
-- =============================================================================
CREATE TABLE IF NOT EXISTS resource_blocks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES tenants(id),
  resource_id  UUID        NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  start_at     TIMESTAMPTZ NOT NULL,
  end_at       TIMESTAMPTZ NOT NULL,
  reason       TEXT,                                       -- motivo do bloqueio (visível ao staff)
  created_by   UUID        REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Garante que o bloqueio tem duração positiva
  CONSTRAINT chk_block_time_range CHECK (end_at > start_at)
);

CREATE TRIGGER trigger_resource_blocks_updated_at
  BEFORE UPDATE ON resource_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE resource_blocks IS 'Bloqueios excepcionais de um recurso. Sobrepõe-se à disponibilidade regular.';


-- =============================================================================
-- TABELA: bookings
-- Marcações/agendamentos confirmados.
-- IMPORTANTE: NÃO tem resource_id. Recursos ligados via booking_resources.
-- Esta separação permite marcações com múltiplos recursos (ex: sala + profissional).
-- =============================================================================
CREATE TABLE IF NOT EXISTS bookings (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL REFERENCES tenants(id),
  client_id           UUID        NOT NULL REFERENCES clients(id),
  service_id          UUID        NOT NULL REFERENCES services(id),
  start_at            TIMESTAMPTZ NOT NULL,
  end_at              TIMESTAMPTZ NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN (
                                    'pending',      -- aguarda confirmação
                                    'confirmed',    -- confirmada
                                    'in_progress',  -- em atendimento
                                    'completed',    -- concluída
                                    'cancelled',    -- cancelada
                                    'no_show'       -- cliente não compareceu
                                  )),
  notes               TEXT,                                -- notas internas da marcação
  price_charged       NUMERIC(10,2),                       -- preço no momento da marcação (pode diferir do serviço)
  cancellation_reason TEXT,
  cancelled_at        TIMESTAMPTZ,
  cancelled_by        UUID        REFERENCES profiles(id), -- quem cancelou (NULL se foi o cliente)
  source              TEXT        NOT NULL DEFAULT 'dashboard'
                                  CHECK (source IN ('dashboard', 'booking_portal', 'whatsapp')),
  created_by          UUID        REFERENCES profiles(id), -- NULL se foi via portal público
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Garante que a marcação tem duração positiva
  CONSTRAINT chk_booking_time_range CHECK (end_at > start_at)
);

CREATE TRIGGER trigger_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE bookings IS 'Marcações/agendamentos. SEM resource_id directo — recursos ligados via booking_resources.';
COMMENT ON COLUMN bookings.price_charged IS 'Preço cobrado no momento da marcação. Preserva histórico mesmo que o serviço mude de preço.';
COMMENT ON COLUMN bookings.source IS 'Origem da marcação: painel de staff, portal público, ou WhatsApp.';


-- =============================================================================
-- TABELA: booking_resources
-- Tabela de junção entre bookings e resources (muitos-para-muitos).
-- Uma marcação pode usar múltiplos recursos (profissional + sala).
-- Um recurso pode ter múltiplas marcações (em horários diferentes).
-- =============================================================================
CREATE TABLE IF NOT EXISTS booking_resources (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id),
  booking_id  UUID        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  resource_id UUID        NOT NULL REFERENCES resources(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Um recurso não pode aparecer duas vezes na mesma marcação
  CONSTRAINT uq_booking_resource UNIQUE (booking_id, resource_id)
);

COMMENT ON TABLE booking_resources IS 'Ligação muitos-para-muitos entre bookings e resources. Garante que bookings.resource_id não existe.';


-- =============================================================================
-- TABELA: whatsapp_conversations
-- Cada linha representa um thread de conversa com um número de WhatsApp.
-- Suporta tanto o simulador actual como o WhatsApp real no futuro.
-- =============================================================================
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL REFERENCES tenants(id),
  client_id        UUID        REFERENCES clients(id),     -- NULL até o cliente ser identificado
  wa_phone_number  TEXT        NOT NULL,                   -- número do cliente no formato internacional: +351912345678
  wa_contact_name  TEXT,                                   -- nome vindo do WhatsApp (pode diferir do cliente)
  status           TEXT        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active', 'waiting', 'resolved', 'archived')),
  assigned_to      UUID        REFERENCES profiles(id),    -- staff responsável pela conversa
  last_message_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_whatsapp_conversations_updated_at
  BEFORE UPDATE ON whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE whatsapp_conversations IS 'Threads de conversa WhatsApp por tenant. Compatível com simulador e WhatsApp real.';


-- =============================================================================
-- TABELA: whatsapp_messages
-- Mensagens individuais de cada conversa.
-- O campo payload guarda o payload completo do webhook (estrutura real da Meta API).
-- Isto garante compatibilidade zero quando o WhatsApp real for integrado.
-- =============================================================================
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL REFERENCES tenants(id),
  conversation_id  UUID        NOT NULL REFERENCES whatsapp_conversations(id),
  wa_message_id    TEXT,                                   -- ID da mensagem no WhatsApp (real ou simulado)
  direction        TEXT        NOT NULL
                               CHECK (direction IN ('inbound', 'outbound')),
  message_type     TEXT        NOT NULL DEFAULT 'text'
                               CHECK (message_type IN ('text', 'image', 'audio', 'document', 'template')),
  content          TEXT,                                   -- texto da mensagem
  media_url        TEXT,                                   -- URL do ficheiro media (imagem, áudio, etc.)

  -- Payload completo no formato exacto do webhook da Meta/WhatsApp Cloud API.
  -- Estrutura: { "object": "whatsapp_business_account", "entry": [...] }
  -- Permite auditoria completa e migração zero para WhatsApp real.
  payload          JSONB,

  sent_by          UUID        REFERENCES profiles(id),    -- preenchido se foi enviado por staff
  is_ai_generated  BOOLEAN     NOT NULL DEFAULT FALSE,     -- TRUE se gerado pelo motor de IA
  delivered_at     TIMESTAMPTZ,
  read_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()

  -- Mensagens são imutáveis: sem updated_at nem deleted_at
);

COMMENT ON TABLE whatsapp_messages IS 'Mensagens individuais. O campo payload segue a estrutura real do webhook Meta API.';
COMMENT ON COLUMN whatsapp_messages.payload IS 'Payload completo do webhook Meta API. Estrutura idêntica ao webhook real para migração zero-cost.';


-- =============================================================================
-- TABELA: ai_contexts
-- Contexto acumulado de cada conversa para o motor de IA.
-- pending_action: acção proposta pela IA que aguarda confirmação do cliente.
-- REGRA CRÍTICA: a IA propõe acções neste campo — o sistema as executa.
-- =============================================================================
CREATE TABLE IF NOT EXISTS ai_contexts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id),
  conversation_id UUID        NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,

  -- Contexto acumulado da conversa (historial resumido, preferências detectadas)
  context         JSONB       NOT NULL DEFAULT '{}',

  -- Último intent detectado: 'agendar', 'cancelar', 'reagendar', 'informacao', 'outro'
  intent          TEXT,

  -- Acção pendente de confirmação pelo cliente.
  -- Ex: { "type": "create_booking", "service_id": "...", "resource_id": "...", "slot_start": "..." }
  -- IMPORTANTE: a IA escreve aqui — o sistema lê e executa após confirmação
  pending_action  JSONB,

  -- Vector embedding para pesquisa semântica (RAG) — dimensão 1536 para OpenAI / compatível
  -- Requer a extensão pgvector instalada em 0001_extensions.sql
  embedding       vector(1536),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_ai_contexts_updated_at
  BEFORE UPDATE ON ai_contexts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE ai_contexts IS 'Contexto do motor de IA por conversa. A IA propõe acções em pending_action — o sistema executa-as.';
COMMENT ON COLUMN ai_contexts.pending_action IS 'Acção proposta pela IA aguardando confirmação do cliente. Nunca executada directamente pela IA.';
COMMENT ON COLUMN ai_contexts.embedding IS 'Vector 1536d para RAG futuro. Requer pgvector. NULL até integração de IA real.';


-- =============================================================================
-- TABELA: legal_consents
-- Registo imutável de consentimentos RGPD/LGPD por cliente.
-- NUNCA apagar linhas desta tabela — é evidência legal.
-- =============================================================================
CREATE TABLE IF NOT EXISTS legal_consents (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL REFERENCES tenants(id),
  client_id        UUID        NOT NULL REFERENCES clients(id),

  -- Tipo de consentimento registado
  consent_type     TEXT        NOT NULL
                               CHECK (consent_type IN (
                                 'privacy_policy',      -- política de privacidade
                                 'marketing',           -- comunicações de marketing
                                 'data_processing',     -- tratamento de dados pessoais
                                 'cookies'              -- cookies e rastreamento
                               )),

  consent_version  TEXT        NOT NULL,                 -- versão do documento consentido: "v1.2"
  consented        BOOLEAN     NOT NULL,                 -- TRUE=consentiu, FALSE=recusou/revogou
  ip_address       INET,                                 -- endereço IP no momento do consentimento
  user_agent       TEXT,                                 -- browser/dispositivo usado
  consented_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at       TIMESTAMPTZ                           -- preenchido quando o cliente revoga o consentimento

  -- Sem updated_at: registo imutável por obrigação legal
);

COMMENT ON TABLE legal_consents IS 'Registo imutável de consentimentos RGPD/LGPD. Nunca apagar linhas — evidência legal.';
COMMENT ON COLUMN legal_consents.consented IS 'TRUE=consentiu. FALSE=recusou ou revogou consentimento anterior.';


-- =============================================================================
-- TABELA: audit_logs
-- Registo imutável de todas as acções relevantes no sistema.
-- Escrita exclusivamente por funções SECURITY DEFINER — nunca por utilizadores directamente.
-- Essencial para RGPD (direito de acesso) e para debugging em produção.
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        REFERENCES tenants(id),         -- NULL para acções do sistema sem tenant
  actor_id    UUID,                                       -- UUID do profile que fez a acção (NULL=sistema)
  action      TEXT        NOT NULL,                       -- ex: 'booking.created', 'client.anonymized', 'tenant.plan_changed'
  table_name  TEXT,                                       -- tabela afectada
  record_id   UUID,                                       -- ID do registo afectado
  old_data    JSONB,                                      -- estado anterior (para UPDATE/DELETE)
  new_data    JSONB,                                      -- novo estado (para INSERT/UPDATE)
  ip_address  INET,                                       -- IP do actor
  metadata    JSONB       NOT NULL DEFAULT '{}',          -- informação adicional livre
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()

  -- Sem updated_at nem deleted_at: registo 100% imutável
);

COMMENT ON TABLE audit_logs IS 'Auditoria imutável de acções. Escrita só por funções SECURITY DEFINER. Nunca apagar.';
COMMENT ON COLUMN audit_logs.action IS 'Formato: tabela.evento. Ex: booking.created, client.anonymized, tenant.deleted.';


-- =============================================================================
-- TABELA: daily_metrics
-- Métricas pré-agregadas por dia e por tenant para dashboards rápidos.
-- Actualizada por triggers ou jobs diários — evita queries pesadas em tempo real.
-- =============================================================================
CREATE TABLE IF NOT EXISTS daily_metrics (
  id                           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                    UUID        NOT NULL REFERENCES tenants(id),
  date                         DATE        NOT NULL,
  bookings_total               INTEGER     NOT NULL DEFAULT 0,
  bookings_completed           INTEGER     NOT NULL DEFAULT 0,
  bookings_cancelled           INTEGER     NOT NULL DEFAULT 0,
  bookings_no_show             INTEGER     NOT NULL DEFAULT 0,
  revenue_total                NUMERIC(12,2) NOT NULL DEFAULT 0,
  new_clients                  INTEGER     NOT NULL DEFAULT 0,
  whatsapp_messages_received   INTEGER     NOT NULL DEFAULT 0,
  whatsapp_messages_sent       INTEGER     NOT NULL DEFAULT 0,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Um registo por tenant por dia
  CONSTRAINT uq_daily_metrics_tenant_date UNIQUE (tenant_id, date)
);

CREATE TRIGGER trigger_daily_metrics_updated_at
  BEFORE UPDATE ON daily_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE daily_metrics IS 'Métricas pré-agregadas para dashboards. Evita queries pesadas em tempo real.';


-- =============================================================================
-- TABELA: feature_flags
-- Flags de funcionalidades por tenant.
-- Permite activar/desactivar funcionalidades por cliente sem novo deploy.
-- Ex: activar WhatsApp real apenas para tenants no plano Pro.
-- =============================================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id),
  flag_name   TEXT        NOT NULL,                       -- ex: 'whatsapp_real', 'ai_enabled', 'booking_portal'
  is_enabled  BOOLEAN     NOT NULL DEFAULT FALSE,
  config      JSONB       NOT NULL DEFAULT '{}',          -- configuração específica da flag
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Uma flag por nome por tenant
  CONSTRAINT uq_feature_flag UNIQUE (tenant_id, flag_name)
);

CREATE TRIGGER trigger_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE feature_flags IS 'Flags por tenant para activar funcionalidades sem novo deploy.';
