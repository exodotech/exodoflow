-- =============================================================================
-- SEED: DADOS DE TESTE  ⚠️  DEV ONLY — NÃO USAR EM PRODUÇÃO
-- Projeto: ExodoFlow AI
-- Descrição: Dados de teste para desenvolvimento local.
--            NUNCA executar em produção.
--            Inclui dois tenants para testar isolamento RLS.
--
-- ⚠️ SENHAS FRACAS (DEV ONLY): test1234 e admin12345 existem APENAS para o
--    ambiente local. O seed só corre via `supabase db reset` em dev — nunca em
--    produção (Supabase Cloud). Antes de produção: criar utilizadores com senhas
--    fortes e ROTACIONAR/remover estas. Ver docs/security-checklist.md (bloqueador
--    de release). O auditor avisa se estas senhas aparecerem fora do seed.
-- =============================================================================

-- ATENÇÃO: Este ficheiro usa UUIDs fixos para facilitar debugging.
-- Em produção, todos os UUIDs são gerados automaticamente.


-- =============================================================================
-- UTILIZADORES DE TESTE (auth.users + auth.identities)
-- Credenciais: owner@clinica-aurora.pt / test1234
--              manager@clinica-aurora.pt / test1234
--
-- IMPORTANTE: o raw_app_meta_data inclui tenant_id por dois motivos:
--   1. auth_tenant_id() lê o tenant_id do JWT — sem ele o RLS bloqueia tudo;
--   2. o trigger on_auth_user_created salta utilizadores que já têm tenant_id
--      (senão criaria um tenant duplicado e o INSERT de profiles abaixo falhava).
-- =============================================================================

-- Owner da Clínica Aurora
INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  -- Tokens como string vazia: GoTrue (Go) falha com NULL nestas colunas
  confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
)
VALUES (
  '11111111-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'owner@clinica-aurora.pt',
  crypt('test1234', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"],"tenant_id":"b1000000-0000-0000-0000-000000000001"}',
  '{"full_name":"José Aurora"}',
  NOW(), NOW(),
  '', '', '', '', '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
VALUES (
  gen_random_uuid(),
  '11111111-0000-0000-0000-000000000001',
  format('{"sub":"%s","email":"owner@clinica-aurora.pt"}',
         '11111111-0000-0000-0000-000000000001')::jsonb,
  'email',
  'owner@clinica-aurora.pt',
  NOW(), NOW(), NOW()
)
ON CONFLICT DO NOTHING;


-- Manager da Clínica Aurora (segundo utilizador para testar permissões)
INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  -- Tokens como string vazia: GoTrue (Go) falha com NULL nestas colunas
  confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
)
VALUES (
  '11111111-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'manager@clinica-aurora.pt',
  crypt('test1234', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"],"tenant_id":"b1000000-0000-0000-0000-000000000001"}',
  '{"full_name":"Ana Manager"}',
  NOW(), NOW(),
  '', '', '', '', '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
VALUES (
  gen_random_uuid(),
  '11111111-0000-0000-0000-000000000002',
  format('{"sub":"%s","email":"manager@clinica-aurora.pt"}',
         '11111111-0000-0000-0000-000000000002')::jsonb,
  'email',
  'manager@clinica-aurora.pt',
  NOW(), NOW(), NOW()
)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- SUPERADMIN — administrador do sistema (sem tenant)
-- Credenciais: admin@exodoflow.pt / admin12345 (ALTERAR em produção!)
-- is_superadmin no metadata faz o trigger de signup saltar este utilizador.
-- =============================================================================
INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
)
VALUES (
  '11111111-0000-0000-0000-000000000099',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'admin@exodoflow.pt',
  crypt('admin12345', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"],"is_superadmin":true}',
  '{"full_name":"Administrador ExodoFlow"}',
  NOW(), NOW(),
  '', '', '', '', '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
VALUES (
  gen_random_uuid(),
  '11111111-0000-0000-0000-000000000099',
  format('{"sub":"%s","email":"admin@exodoflow.pt"}',
         '11111111-0000-0000-0000-000000000099')::jsonb,
  'email',
  'admin@exodoflow.pt',
  NOW(), NOW(), NOW()
)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- PLANOS
-- =============================================================================
INSERT INTO plans (id, name, slug, price_monthly, price_yearly, max_resources, max_clients, features, sort_order)
VALUES
  (
    'a1000000-0000-0000-0000-000000000001',
    'Gratuito',
    'free',
    0.00, 0.00,
    2,    -- máximo 2 recursos (ex: 1 profissional + 1 sala)
    50,   -- máximo 50 clientes
    '{"booking_portal": true, "whatsapp_simulator": false, "ai": false}',
    1
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    'Starter',
    'starter',
    29.00, 290.00,
    5, 500,
    '{"booking_portal": true, "whatsapp_simulator": true, "ai": false}',
    2
  ),
  (
    'a1000000-0000-0000-0000-000000000003',
    'Pro',
    'pro',
    79.00, 790.00,
    NULL,  -- ilimitado
    NULL,  -- ilimitado
    '{"booking_portal": true, "whatsapp_simulator": true, "ai": true}',
    3
  );


-- =============================================================================
-- TENANT A: Clínica Estética Aurora (tenant de teste principal)
-- onboarding_completed = TRUE para não ser redirecionado ao fazer login
-- =============================================================================
INSERT INTO tenants (id, plan_id, name, slug, business_type, phone, email, settings, onboarding_completed, onboarding_step)
VALUES (
  'b1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000002',  -- plano Starter
  'Clínica Estética Aurora',
  'clinica-aurora',
  'estetica',
  '+351912345678',
  'contacto@clinica-aurora.pt',
  '{"timezone": "Europe/Lisbon", "currency": "EUR", "slot_interval_minutes": 15}',
  TRUE,   -- onboarding concluído — sem isto o login redireciona para /onboarding
  7       -- todos os 7 passos completados
);


-- =============================================================================
-- TENANT B: Barbearia Central (segundo tenant para testar isolamento RLS)
-- =============================================================================
INSERT INTO tenants (id, plan_id, name, slug, business_type, phone, email, settings, onboarding_completed, onboarding_step)
VALUES (
  'b2000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000001',  -- plano Gratuito
  'Barbearia Central',
  'barbearia-central',
  'barbearia',
  '+351987654321',
  'geral@barbearia-central.pt',
  '{"timezone": "Europe/Lisbon", "currency": "EUR", "slot_interval_minutes": 30}',
  TRUE,
  7
);


-- =============================================================================
-- PROFILES (ligam auth.users às tenants + definem o role)
-- =============================================================================
INSERT INTO profiles (id, tenant_id, role, full_name)
VALUES
  (
    '11111111-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'owner',
    'José Aurora'
  ),
  (
    '11111111-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000001',
    'manager',
    'Ana Manager'
  )
ON CONFLICT (id) DO UPDATE
  SET tenant_id = EXCLUDED.tenant_id,
      role      = EXCLUDED.role,
      full_name = EXCLUDED.full_name;

-- Profile do SUPERADMIN — tenant_id NULL (não pertence a nenhum tenant)
INSERT INTO profiles (id, tenant_id, role, full_name)
VALUES (
  '11111111-0000-0000-0000-000000000099',
  NULL,
  'superadmin',
  'Administrador ExodoFlow'
)
ON CONFLICT (id) DO UPDATE
  SET role = 'superadmin', tenant_id = NULL;


-- =============================================================================
-- SERVIÇOS — Tenant A (Clínica Estética Aurora)
-- =============================================================================
INSERT INTO services (id, tenant_id, name, description, duration_minutes, price, color, sort_order)
VALUES
  (
    'c1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'Limpeza de Pele',
    'Limpeza profunda com extracção de comedões e hidratação.',
    60, 45.00, '#6366f1', 1
  ),
  (
    'c1000000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000001',
    'Massagem Relaxante',
    'Massagem corporal com óleos essenciais.',
    90, 65.00, '#ec4899', 2
  ),
  (
    'c1000000-0000-0000-0000-000000000003',
    'b1000000-0000-0000-0000-000000000001',
    'Manicure',
    'Tratamento completo de unhas com verniz.',
    45, 25.00, '#14b8a6', 3
  );


-- =============================================================================
-- SERVIÇOS — Tenant B (Barbearia Central)
-- Para verificar que os serviços do tenant B não aparecem nas queries do tenant A
-- =============================================================================
INSERT INTO services (id, tenant_id, name, duration_minutes, price, color)
VALUES (
  'c2000000-0000-0000-0000-000000000001',
  'b2000000-0000-0000-0000-000000000002',
  'Corte de Cabelo',
  30, 15.00, '#f59e0b'
);


-- =============================================================================
-- RECURSOS — Tenant A (profissionais)
-- =============================================================================
INSERT INTO resources (id, tenant_id, name, type, color)
VALUES
  (
    'd1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'Ana Ferreira',
    'staff',
    '#6366f1'
  ),
  (
    'd1000000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000001',
    'Sofia Mendes',
    'staff',
    '#ec4899'
  ),
  (
    'd1000000-0000-0000-0000-000000000003',
    'b1000000-0000-0000-0000-000000000001',
    'Sala Tratamentos 1',
    'room',
    '#14b8a6'
  );


-- =============================================================================
-- DISPONIBILIDADE — Ana Ferreira (segunda a sexta, 09:00-18:00)
-- =============================================================================
INSERT INTO resource_availability (tenant_id, resource_id, day_of_week, start_time, end_time)
VALUES
  -- Segunda-feira (1)
  ('b1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 1, '09:00', '18:00'),
  -- Terça-feira (2)
  ('b1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 2, '09:00', '18:00'),
  -- Quarta-feira (3)
  ('b1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 3, '09:00', '18:00'),
  -- Quinta-feira (4)
  ('b1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 4, '09:00', '18:00'),
  -- Sexta-feira (5)
  ('b1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 5, '09:00', '17:00');


-- =============================================================================
-- DISPONIBILIDADE — Sofia Mendes (terça a sábado, 10:00-19:00)
-- =============================================================================
INSERT INTO resource_availability (tenant_id, resource_id, day_of_week, start_time, end_time)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000002', 2, '10:00', '19:00'),
  ('b1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000002', 3, '10:00', '19:00'),
  ('b1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000002', 4, '10:00', '19:00'),
  ('b1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000002', 5, '10:00', '19:00'),
  ('b1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000002', 6, '10:00', '15:00');


-- =============================================================================
-- CLIENTES — Tenant A
-- =============================================================================
INSERT INTO clients (id, tenant_id, full_name, phone, email, gdpr_consent_at)
VALUES
  (
    'e1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'Maria Oliveira',
    '+351921111111',
    'maria.oliveira@email.pt',
    NOW()
  ),
  (
    'e1000000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000001',
    'João Santos',
    '+351922222222',
    'joao.santos@email.pt',
    NOW()
  );


-- =============================================================================
-- CLIENTES — Tenant B (para testar isolamento RLS)
-- =============================================================================
INSERT INTO clients (id, tenant_id, full_name, phone)
VALUES (
  'e2000000-0000-0000-0000-000000000001',
  'b2000000-0000-0000-0000-000000000002',
  'Carlos Silva',
  '+351933333333'
);


-- =============================================================================
-- MARCAÇÃO DE TESTE — Tenant A
-- Ana Ferreira + Sala Tratamentos 1 para Maria Oliveira
-- Segunda-feira 10:00-11:00 (Limpeza de Pele, 60 min)
-- =============================================================================
INSERT INTO bookings (id, tenant_id, client_id, service_id, start_at, end_at, status, price_charged, source)
VALUES (
  'f1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',  -- Maria Oliveira
  'c1000000-0000-0000-0000-000000000001',  -- Limpeza de Pele
  '2026-06-11 09:00:00+00',  -- 10:00 Lisboa = 09:00 UTC
  '2026-06-11 10:00:00+00',  -- 11:00 Lisboa = 10:00 UTC
  'confirmed',
  45.00,
  'dashboard'
);

-- Ligar recursos à marcação (via booking_resources, não via resource_id em bookings)
INSERT INTO booking_resources (tenant_id, booking_id, resource_id)
VALUES
  (
    'b1000000-0000-0000-0000-000000000001',
    'f1000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000001'  -- Ana Ferreira
  ),
  (
    'b1000000-0000-0000-0000-000000000001',
    'f1000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000003'  -- Sala Tratamentos 1
  );


-- =============================================================================
-- BLOQUEIO DE TESTE — Ana Ferreira de folga na tarde de quinta
-- =============================================================================
INSERT INTO resource_blocks (tenant_id, resource_id, start_at, end_at, reason)
VALUES (
  'b1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000001',
  '2026-06-12 13:00:00+00',
  '2026-06-12 17:00:00+00',
  'Formação profissional'
);


-- =============================================================================
-- FEATURE FLAGS — Tenant A
-- =============================================================================
INSERT INTO feature_flags (tenant_id, flag_name, is_enabled)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'booking_portal',      TRUE),
  ('b1000000-0000-0000-0000-000000000001', 'whatsapp_simulator',  TRUE),
  ('b1000000-0000-0000-0000-000000000001', 'whatsapp_real',       FALSE),
  ('b1000000-0000-0000-0000-000000000001', 'ai_enabled',          FALSE);

-- =============================================================================
-- CANAIS E TEMPLATES DE COMUNICAÇÃO — Tenant A
-- (Movido da migration 0007: dados de exemplo pertencem ao seed, não a migrations)
-- =============================================================================
INSERT INTO communication_channels (tenant_id, channel, is_active, config)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'whatsapp', FALSE, '{}'),
  ('b1000000-0000-0000-0000-000000000001', 'sms',      FALSE, '{}'),
  ('b1000000-0000-0000-0000-000000000001', 'email',    FALSE, '{}')
ON CONFLICT (tenant_id, channel) DO NOTHING;

INSERT INTO communication_templates (tenant_id, channel, event_type, name, body, locale)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'whatsapp', 'booking_created',
   'Confirmação de Marcação',
   'Olá {{nome}}! A sua marcação foi registada para {{data}} às {{hora}} ({{servico}} com {{profissional}}). Obrigada pela preferência! 🌿',
   'pt-PT'),
  ('b1000000-0000-0000-0000-000000000001', 'whatsapp', 'booking_confirmed',
   'Marcação Confirmada',
   'Olá {{nome}}! A sua marcação está confirmada: {{data}} às {{hora}} — {{servico}} com {{profissional}}. Até breve! ✨',
   'pt-PT'),
  ('b1000000-0000-0000-0000-000000000001', 'whatsapp', 'booking_cancelled',
   'Marcação Cancelada',
   'Olá {{nome}}, a sua marcação de {{data}} às {{hora}} foi cancelada. Para reagendar, contacte-nos. Lamentamos o incómodo.',
   'pt-PT'),
  ('b1000000-0000-0000-0000-000000000001', 'whatsapp', 'booking_reminder_24h',
   'Lembrete 24h',
   'Olá {{nome}}! Lembrete: tem marcação amanhã às {{hora}} para {{servico}}. Até amanhã! 😊',
   'pt-PT'),
  ('b1000000-0000-0000-0000-000000000001', 'sms', 'booking_created',
   'Confirmação SMS',
   'ExodoFlow: Marcação registada para {{data}} {{hora}} ({{servico}}). Confirmação enviada.',
   'pt-PT'),
  ('b1000000-0000-0000-0000-000000000001', 'email', 'booking_created',
   'Confirmação por Email',
   'Prezado/a {{nome}},

A sua marcação foi registada com sucesso.

Data: {{data}}
Hora: {{hora}}
Serviço: {{servico}}
Profissional: {{profissional}}

Com os melhores cumprimentos.',
   'pt-PT')
ON CONFLICT (tenant_id, channel, event_type, locale) DO NOTHING;
