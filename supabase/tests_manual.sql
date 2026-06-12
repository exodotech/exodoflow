-- =============================================================================
-- TESTES MANUAIS DE VALIDAÇÃO — ExodoFlow AI
-- Projecto: ExodoFlow AI
-- Descrição: Queries SQL para verificar manualmente que o schema, RLS e funções
--            estão a funcionar correctamente após execução das migrações.
--
-- COMO EXECUTAR:
--   1. Executar as 5 migrações em ordem
--   2. Executar seed.sql para ter dados de teste
--   3. Executar cada TESTE individualmente no SQL Editor do Supabase
--   4. Verificar se o resultado corresponde ao ESPERADO descrito em cada teste
--
-- ATENÇÃO:
--   Cada teste usa BEGIN/ROLLBACK para não poluir a base de dados.
--   Excepção: testes que verificam isolamento precisam de dados do seed.
-- =============================================================================


-- =============================================================================
-- TESTE 1: ISOLAMENTO RLS — Tenant A não vê dados do Tenant B
-- ESPERADO: 0 linhas (utilizador do tenant A não vê clientes do tenant B)
-- =============================================================================
BEGIN;

-- Simular utilizador autenticado do Tenant A
-- O JWT app_metadata contém o tenant_id do tenant A
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{
  "sub":  "00000000-0000-0000-0000-000000000099",
  "app_metadata": {
    "tenant_id": "b1000000-0000-0000-0000-000000000001"
  }
}';

-- Esta query deve retornar APENAS clientes do tenant A
-- O cliente 'Carlos Silva' (tenant B) NÃO deve aparecer
SELECT id, full_name, tenant_id
FROM clients
ORDER BY full_name;
-- ESPERADO: 2 linhas (Maria Oliveira, João Santos) — sem Carlos Silva

-- Verificar contagem
SELECT COUNT(*) AS total_clientes
FROM clients;
-- ESPERADO: 2 (apenas clientes do tenant A)

-- Tentar aceder directamente ao cliente do tenant B (deve retornar 0 linhas, não erro)
SELECT COUNT(*) AS deve_ser_zero
FROM clients
WHERE id = 'e2000000-0000-0000-0000-000000000001';
-- ESPERADO: 0 (RLS filtra silenciosamente)

ROLLBACK;


-- =============================================================================
-- TESTE 2: CLIENTE CRIADO COM O TENANT CORRECTO
-- ESPERADO: INSERT aceite com tenant_id correcto; recusado com tenant_id diferente
-- =============================================================================
BEGIN;

SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{
  "sub":  "00000000-0000-0000-0000-000000000099",
  "app_metadata": {
    "tenant_id": "b1000000-0000-0000-0000-000000000001"
  }
}';

-- Teste 2a: INSERT com tenant_id correcto — deve ser ACEITE
INSERT INTO clients (tenant_id, full_name, phone, gdpr_consent_at)
VALUES (
  'b1000000-0000-0000-0000-000000000001',  -- tenant_id correcto (igual ao JWT)
  'Teste Cliente Válido',
  '+351900000001',
  NOW()
);
-- ESPERADO: 1 linha inserida

-- Verificar que foi inserido
SELECT full_name, tenant_id FROM clients WHERE full_name = 'Teste Cliente Válido';
-- ESPERADO: 1 linha com tenant_id = b1000000-0000-0000-0000-000000000001

ROLLBACK;

BEGIN;

SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{
  "sub":  "00000000-0000-0000-0000-000000000099",
  "app_metadata": {
    "tenant_id": "b1000000-0000-0000-0000-000000000001"
  }
}';

-- Teste 2b: INSERT com tenant_id de OUTRO tenant — deve ser RECUSADO (RLS WITH CHECK)
INSERT INTO clients (tenant_id, full_name, phone)
VALUES (
  'b2000000-0000-0000-0000-000000000002',  -- tenant_id ERRADO (tenant B)
  'Tentativa de Injecção Cross-Tenant',
  '+351900000002'
);
-- ESPERADO: ERRO — violação da política RLS "clients_insert_own_tenant"

ROLLBACK;


-- =============================================================================
-- TESTE 3: BOOKING USA BOOKING_RESOURCES (não resource_id directo)
-- ESPERADO: bookings não tem coluna resource_id; recursos ligados via booking_resources
-- =============================================================================

-- Verificar que a coluna resource_id NÃO existe em bookings
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'bookings'
  AND column_name = 'resource_id';
-- ESPERADO: 0 linhas (a coluna não deve existir)

-- Verificar que o booking de teste tem recursos ligados via booking_resources
SELECT
  b.id          AS booking_id,
  b.status,
  r.name        AS recurso,
  r.type        AS tipo_recurso
FROM bookings b
INNER JOIN booking_resources br ON br.booking_id = b.id
INNER JOIN resources r          ON r.id          = br.resource_id
WHERE b.id = 'f1000000-0000-0000-0000-000000000001';
-- ESPERADO: 2 linhas — "Ana Ferreira" (staff) e "Sala Tratamentos 1" (room)

-- Verificar que a constraint UNIQUE em booking_resources funciona
BEGIN;
INSERT INTO booking_resources (tenant_id, booking_id, resource_id)
VALUES (
  'b1000000-0000-0000-0000-000000000001',
  'f1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000001'  -- Ana Ferreira (já ligada)
);
-- ESPERADO: ERRO — violação de uq_booking_resource
ROLLBACK;


-- =============================================================================
-- TESTE 4: resource_id NÃO EXISTE NA TABELA bookings
-- (já coberto no Teste 3, mas com verificação estrutural explícita)
-- =============================================================================

SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'bookings'
ORDER BY ordinal_position;
-- ESPERADO: lista de colunas de bookings SEM nenhuma chamada "resource_id"


-- =============================================================================
-- TESTE 5: get_available_slots NÃO retorna horário já ocupado
-- Contexto: Ana Ferreira tem booking das 09:00 às 10:00 UTC (10:00-11:00 Lisboa)
-- ESPERADO: o slot 09:00-10:00 UTC não aparece nos resultados
-- =============================================================================
SELECT
  resource_id,
  slot_start AT TIME ZONE 'Europe/Lisbon' AS slot_inicio_local,
  slot_end   AT TIME ZONE 'Europe/Lisbon' AS slot_fim_local
FROM get_available_slots(
  'b1000000-0000-0000-0000-000000000001',                  -- tenant A
  ARRAY['d1000000-0000-0000-0000-000000000001'::UUID],     -- apenas Ana Ferreira
  'c1000000-0000-0000-0000-000000000001',                  -- Limpeza de Pele (60 min)
  '2026-06-09',                                            -- segunda-feira de teste
  '2026-06-09'
)
ORDER BY slot_start;
-- ESPERADO: slots das 09:00 às ~13:00 Lisboa (09:00 UTC = 10:00 Lisboa)
-- NÃO deve aparecer: 10:00-11:00 Lisboa (horário do booking existente = 09:00-10:00 UTC)


-- =============================================================================
-- TESTE 6: get_available_slots NÃO retorna horário bloqueado
-- Contexto: Ana Ferreira tem bloqueio das 13:00 às 17:00 UTC (14:00-18:00 Lisboa)
-- ESPERADO: slots das 14:00 às 18:00 Lisboa não aparecem
-- =============================================================================
SELECT
  resource_id,
  slot_start AT TIME ZONE 'Europe/Lisbon' AS slot_inicio_local,
  slot_end   AT TIME ZONE 'Europe/Lisbon' AS slot_fim_local
FROM get_available_slots(
  'b1000000-0000-0000-0000-000000000001',
  ARRAY['d1000000-0000-0000-0000-000000000001'::UUID],
  'c1000000-0000-0000-0000-000000000001',  -- Limpeza de Pele (60 min)
  '2026-06-09',
  '2026-06-09'
)
ORDER BY slot_start;
-- ESPERADO: sem slots entre 14:00 e 18:00 Lisboa (período bloqueado)
-- O último slot disponível deve ser às ~13:00 Lisboa (1 hora antes do bloqueio)


-- =============================================================================
-- TESTE 7: anonymize_client remove dados pessoais
-- =============================================================================
BEGIN;

-- Estado antes da anonimização
SELECT id, full_name, phone, email, is_anonymized
FROM clients
WHERE id = 'e1000000-0000-0000-0000-000000000001';
-- ESPERADO: dados reais de Maria Oliveira, is_anonymized = FALSE

-- Executar anonimização
SELECT anonymize_client(
  'e1000000-0000-0000-0000-000000000001',  -- client_id
  'b1000000-0000-0000-0000-000000000001'   -- tenant_id
);

-- Estado após anonimização
SELECT id, full_name, phone, email, nif, notes, is_anonymized
FROM clients
WHERE id = 'e1000000-0000-0000-0000-000000000001';
-- ESPERADO:
--   full_name     = 'Cliente Anónimo e1000000' (primeiros 8 chars do UUID)
--   phone         = NULL
--   email         = NULL
--   nif           = NULL
--   notes         = NULL
--   is_anonymized = TRUE

-- Verificar que o audit_log foi criado
SELECT action, table_name, record_id, metadata
FROM audit_logs
WHERE action = 'client.anonymized'
  AND record_id = 'e1000000-0000-0000-0000-000000000001';
-- ESPERADO: 1 linha com a anonimização registada

-- Tentar anonimizar novamente — deve dar erro (idempotência)
SELECT anonymize_client(
  'e1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001'
);
-- ESPERADO: ERRO — "Cliente ... já foi anonimizado anteriormente"

ROLLBACK;


-- =============================================================================
-- TESTE 8: RLS ESTÁ ACTIVO EM TODAS AS TABELAS
-- =============================================================================
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_activo
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'plans', 'tenants', 'profiles', 'clients', 'services',
    'resources', 'resource_availability', 'resource_blocks',
    'bookings', 'booking_resources', 'whatsapp_conversations',
    'whatsapp_messages', 'ai_contexts', 'legal_consents',
    'audit_logs', 'daily_metrics', 'feature_flags'
  )
ORDER BY tablename;
-- ESPERADO: todas as 17 tabelas com rls_activo = TRUE


-- =============================================================================
-- TESTE 9: VERIFICAÇÃO ESTRUTURAL — todas as tabelas com tenant_id têm o campo
-- =============================================================================
SELECT
  t.table_name,
  CASE WHEN c.column_name IS NOT NULL THEN 'SIM' ELSE 'NÃO — VERIFICAR!' END AS tem_tenant_id
FROM information_schema.tables t
LEFT JOIN information_schema.columns c
  ON  c.table_name  = t.table_name
  AND c.table_schema = 'public'
  AND c.column_name = 'tenant_id'
WHERE t.table_schema = 'public'
  AND t.table_type   = 'BASE TABLE'
  AND t.table_name  != 'plans'    -- plans é tabela global, sem tenant_id
ORDER BY t.table_name;
-- ESPERADO: todas as tabelas (excepto plans) com 'SIM'


-- =============================================================================
-- TESTE 10: get_available_slots retorna vazio para recursos sem disponibilidade
-- =============================================================================
SELECT COUNT(*) AS slots_disponiveis
FROM get_available_slots(
  'b1000000-0000-0000-0000-000000000001',
  ARRAY['d1000000-0000-0000-0000-000000000001'::UUID],
  'c1000000-0000-0000-0000-000000000001',
  '2026-06-07',  -- domingo (Ana não trabalha ao domingo)
  '2026-06-07'
);
-- ESPERADO: 0 (Ana Ferreira não tem disponibilidade ao domingo)


-- =============================================================================
-- TESTE 11: get_available_slots rejeita array vazio de recursos
-- =============================================================================
SELECT * FROM get_available_slots(
  'b1000000-0000-0000-0000-000000000001',
  ARRAY[]::UUID[],  -- array vazio
  'c1000000-0000-0000-0000-000000000001',
  '2026-06-09',
  '2026-06-09'
);
-- ESPERADO: 0 linhas (sem erro — retorna tabela vazia)


-- =============================================================================
-- TESTE 12: get_available_slots rejeita datas invertidas
-- =============================================================================
SELECT * FROM get_available_slots(
  'b1000000-0000-0000-0000-000000000001',
  ARRAY['d1000000-0000-0000-0000-000000000001'::UUID],
  'c1000000-0000-0000-0000-000000000001',
  '2026-06-10',  -- data_inicio depois de data_fim
  '2026-06-09'
);
-- ESPERADO: ERRO — "data_inicio não pode ser posterior a data_fim"


-- =============================================================================
-- SUMÁRIO DE RESULTADOS ESPERADOS
-- =============================================================================
-- Teste 1:  RLS isola tenants — ✓ se 0 linhas cross-tenant
-- Teste 2a: INSERT válido aceite — ✓ se 1 linha inserida
-- Teste 2b: INSERT cross-tenant recusado — ✓ se erro RLS
-- Teste 3:  booking_resources funciona — ✓ se 2 recursos ligados
-- Teste 4:  resource_id ausente em bookings — ✓ se 0 linhas na query estrutural
-- Teste 5:  slot ocupado excluído — ✓ se 10:00-11:00 Lisboa não aparece
-- Teste 6:  slot bloqueado excluído — ✓ se 14:00-18:00 Lisboa não aparece
-- Teste 7:  anonimização funciona — ✓ se dados removidos + audit_log criado
-- Teste 8:  RLS activo em 17 tabelas — ✓ se todas com rls_activo = TRUE
-- Teste 9:  tenant_id presente — ✓ se todas as tabelas (excepto plans) com 'SIM'
-- Teste 10: sem disponibilidade → 0 slots — ✓ se COUNT = 0
-- Teste 11: array vazio → 0 slots — ✓ se 0 linhas sem erro
-- Teste 12: datas invertidas → erro — ✓ se excepção lançada
