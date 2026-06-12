-- =============================================================================
-- MIGRAÇÃO 0007: COMMUNICATION ENGINE BASE + INTERNACIONALIZAÇÃO
-- Projecto: ExodoFlow AI
-- Descrição: Fundação arquitectural para canais de comunicação (PT/BR),
--            identificação fiscal genérica e motor de comunicação.
--            Sem envio real: apenas estrutura de dados e simulação.
-- =============================================================================


-- =============================================================================
-- TABELA: clients — campos de identificação fiscal genérica
-- tax_id:      NIF (PT) | CPF/CNPJ (BR) | campo livre para outros mercados
-- tax_id_type: discriminador do formato ('nif'|'cpf'|'cnpj'|'other')
-- nif:         mantido por retrocompatibilidade — NÃO remover
-- =============================================================================
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS tax_id      TEXT,
  ADD COLUMN IF NOT EXISTS tax_id_type TEXT CHECK (tax_id_type IN ('nif', 'cpf', 'cnpj', 'other'));

COMMENT ON COLUMN clients.tax_id      IS 'Identificação fiscal genérica: NIF (PT), CPF/CNPJ (BR). Substituição progressiva do campo nif.';
COMMENT ON COLUMN clients.tax_id_type IS 'Tipo do tax_id: nif (Portugal), cpf (Brasil PF), cnpj (Brasil PJ), other.';


-- =============================================================================
-- TABELA: communication_channels
-- Representa um canal de comunicação configurado pelo tenant.
-- Ex: WhatsApp, SMS, Email — todos desactivados por padrão nesta fase.
-- =============================================================================
CREATE TABLE IF NOT EXISTS communication_channels (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel     TEXT        NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email')),
  is_active   BOOLEAN     NOT NULL DEFAULT FALSE,
  config      JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, channel)
);

COMMENT ON TABLE  communication_channels           IS 'Canais de comunicação configurados por tenant. Todos inactivos nesta fase (fundação arquitectural).';
COMMENT ON COLUMN communication_channels.channel   IS 'Canal: whatsapp, sms, email.';
COMMENT ON COLUMN communication_channels.is_active IS 'FALSE enquanto integração real não estiver disponível.';
COMMENT ON COLUMN communication_channels.config    IS 'Configuração específica do canal (número de telefone, API keys, etc.) — cifrada em produção.';


-- =============================================================================
-- TABELA: communication_templates
-- Templates de mensagem com placeholders {{nome}}, {{data}}, {{hora}}, etc.
-- Associados a eventos (booking_created, booking_confirmed, etc.)
-- =============================================================================
CREATE TABLE IF NOT EXISTS communication_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel     TEXT        NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email')),
  event_type  TEXT        NOT NULL CHECK (event_type IN (
                'booking_created',
                'booking_confirmed',
                'booking_cancelled',
                'booking_reminder_24h',
                'booking_reminder_1h',
                'booking_completed',
                'booking_no_show'
              )),
  name        TEXT        NOT NULL,
  body        TEXT        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  locale      TEXT        NOT NULL DEFAULT 'pt-PT' CHECK (locale IN ('pt-PT', 'pt-BR')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, channel, event_type, locale)
);

COMMENT ON TABLE  communication_templates            IS 'Templates de mensagem por canal, evento e locale. Placeholders: {{nome}}, {{data}}, {{hora}}, {{servico}}, {{profissional}}.';
COMMENT ON COLUMN communication_templates.event_type IS 'Evento que dispara este template.';
COMMENT ON COLUMN communication_templates.body       IS 'Corpo da mensagem com placeholders {{nome}}, {{data}}, {{hora}}, {{servico}}, {{profissional}}, {{link}}.';
COMMENT ON COLUMN communication_templates.locale     IS 'Locale do template: pt-PT (Portugal) ou pt-BR (Brasil).';


-- =============================================================================
-- TABELA: communication_logs
-- Registo imutável de todas as comunicações (reais e simuladas).
-- status 'simulated' indica que foi apenas registado mas não enviado.
-- =============================================================================
CREATE TABLE IF NOT EXISTS communication_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id  UUID        REFERENCES bookings(id) ON DELETE SET NULL,
  client_id   UUID        REFERENCES clients(id)  ON DELETE SET NULL,
  channel     TEXT        NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email')),
  event_type  TEXT        NOT NULL,
  template_id UUID        REFERENCES communication_templates(id) ON DELETE SET NULL,
  recipient   TEXT        NOT NULL,
  body        TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'simulated'
                CHECK (status IN ('simulated', 'queued', 'sent', 'delivered', 'failed')),
  error       TEXT,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  communication_logs            IS 'Log imutável de comunicações. status=simulated significa que foi registado mas não enviado (fase actual).';
COMMENT ON COLUMN communication_logs.status     IS 'simulated: apenas log; queued/sent/delivered/failed: ciclo de vida real (fases futuras).';
COMMENT ON COLUMN communication_logs.recipient  IS 'Número de telefone ou endereço de email do destinatário.';
COMMENT ON COLUMN communication_logs.body       IS 'Corpo da mensagem após interpolação de placeholders.';


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE communication_channels  ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_logs      ENABLE ROW LEVEL SECURITY;

-- communication_channels
CREATE POLICY "tenant_isolation_channels"
  ON communication_channels FOR ALL
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- communication_templates
CREATE POLICY "tenant_isolation_templates"
  ON communication_templates FOR ALL
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- communication_logs — INSERT e SELECT; sem UPDATE/DELETE (log imutável)
CREATE POLICY "tenant_isolation_logs_select"
  ON communication_logs FOR SELECT
  USING (tenant_id = auth_tenant_id());

CREATE POLICY "tenant_isolation_logs_insert"
  ON communication_logs FOR INSERT
  WITH CHECK (tenant_id = auth_tenant_id());


-- =============================================================================
-- ÍNDICES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_comm_channels_tenant   ON communication_channels  (tenant_id);
CREATE INDEX IF NOT EXISTS idx_comm_templates_tenant  ON communication_templates (tenant_id);
CREATE INDEX IF NOT EXISTS idx_comm_templates_event   ON communication_templates (tenant_id, event_type, locale);
CREATE INDEX IF NOT EXISTS idx_comm_logs_tenant       ON communication_logs      (tenant_id);
CREATE INDEX IF NOT EXISTS idx_comm_logs_booking      ON communication_logs      (booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comm_logs_client       ON communication_logs      (client_id)  WHERE client_id  IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comm_logs_created      ON communication_logs      (tenant_id, created_at DESC);


-- =============================================================================
-- SEED: Templates padrão para o tenant de exemplo
-- Tenant seed: b1000000-0000-0000-0000-000000000001
-- =============================================================================
DO $$
DECLARE
  v_tenant UUID := 'b1000000-0000-0000-0000-000000000001';
BEGIN
  -- GUARD: numa base de dados limpa as migrations correm ANTES do seed.sql,
  -- logo o tenant de exemplo ainda não existe. Sem este guard, o db reset
  -- falhava com violação de FK (bug real corrigido). Os dados de exemplo
  -- são inseridos pelo seed.sql.
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = v_tenant) THEN
    RETURN;
  END IF;

  -- Canal WhatsApp (inactivo por padrão)
  INSERT INTO communication_channels (tenant_id, channel, is_active, config)
  VALUES (v_tenant, 'whatsapp', FALSE, '{}')
  ON CONFLICT (tenant_id, channel) DO NOTHING;

  INSERT INTO communication_channels (tenant_id, channel, is_active, config)
  VALUES (v_tenant, 'sms', FALSE, '{}')
  ON CONFLICT (tenant_id, channel) DO NOTHING;

  INSERT INTO communication_channels (tenant_id, channel, is_active, config)
  VALUES (v_tenant, 'email', FALSE, '{}')
  ON CONFLICT (tenant_id, channel) DO NOTHING;

  -- Templates WhatsApp PT-PT
  INSERT INTO communication_templates (tenant_id, channel, event_type, name, body, locale)
  VALUES
    (v_tenant, 'whatsapp', 'booking_created',
     'Confirmação de Marcação',
     'Olá {{nome}}! A sua marcação foi registada para {{data}} às {{hora}} ({{servico}} com {{profissional}}). Obrigada pela preferência! 🌿',
     'pt-PT'),
    (v_tenant, 'whatsapp', 'booking_confirmed',
     'Marcação Confirmada',
     'Olá {{nome}}! A sua marcação está confirmada: {{data}} às {{hora}} — {{servico}} com {{profissional}}. Até breve! ✨',
     'pt-PT'),
    (v_tenant, 'whatsapp', 'booking_cancelled',
     'Marcação Cancelada',
     'Olá {{nome}}, a sua marcação de {{data}} às {{hora}} foi cancelada. Para reagendar, contacte-nos. Lamentamos o incómodo.',
     'pt-PT'),
    (v_tenant, 'whatsapp', 'booking_reminder_24h',
     'Lembrete 24h',
     'Olá {{nome}}! Lembrete: tem marcação amanhã às {{hora}} para {{servico}}. Até amanhã! 😊',
     'pt-PT'),
    (v_tenant, 'sms', 'booking_created',
     'Confirmação SMS',
     'ExodoFlow: Marcação registada para {{data}} {{hora}} ({{servico}}). Confirmação enviada.',
     'pt-PT'),
    (v_tenant, 'email', 'booking_created',
     'Confirmação por Email',
     'Prezado/a {{nome}},\n\nA sua marcação foi registada com sucesso.\n\nData: {{data}}\nHora: {{hora}}\nServiço: {{servico}}\nProfissional: {{profissional}}\n\nCom os melhores cumprimentos.',
     'pt-PT')
  ON CONFLICT (tenant_id, channel, event_type, locale) DO NOTHING;
END;
$$;
