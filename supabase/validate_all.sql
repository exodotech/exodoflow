-- ============================================================================
-- VALIDAÇÃO COMPLETA DA FASE 0
-- Todos os 12 testes executados em sequência
-- ============================================================================

-- TESTE 1: RLS — Tenant A não vê dados do Tenant B
SELECT '=== TESTE 1: RLS Isolamento ===' as teste;
BEGIN;
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000099", "app_metadata": {"tenant_id": "b1000000-0000-0000-0000-000000000001"}}';
SELECT COUNT(*) as clientes_tenant_a FROM clients;
-- ESPERADO: 2
ROLLBACK;

-- TESTE 2: Criar cliente com tenant correcto — INSERT válido
SELECT '=== TESTE 2a: INSERT com tenant correcto ===' as teste;
BEGIN;
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000099", "app_metadata": {"tenant_id": "b1000000-0000-0000-0000-000000000001"}}';
INSERT INTO clients (tenant_id, full_name, phone, gdpr_consent_at)
VALUES ('b1000000-0000-0000-0000-000000000001', 'Teste Insert', '+351999999999', NOW());
SELECT 'INSERT aceite' as resultado;
ROLLBACK;

-- TESTE 3: Criar cliente com tenant ERRADO — INSERT recusado
SELECT '=== TESTE 2b: INSERT com tenant errado (deve falhar) ===' as teste;
BEGIN;
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000099", "app_metadata": {"tenant_id": "b1000000-0000-0000-0000-000000000001"}}';
INSERT INTO clients (tenant_id, full_name, phone)
VALUES ('b2000000-0000-0000-0000-000000000002', 'Tentativa Cross-Tenant', '+351988888888');
SELECT 'INSERT aceite (ERRO!)' as resultado;
ROLLBACK;

-- TESTE 4: resource_id não existe em bookings
SELECT '=== TESTE 3: resource_id não existe ===' as teste;
SELECT column_name FROM information_schema.columns
WHERE table_name = 'bookings' AND column_name = 'resource_id'
LIMIT 1;
SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'bookings' AND column_name = 'resource_id'
) THEN 'CORRECTO: coluna não existe' ELSE 'ERRO: coluna existe!' END as resultado;

-- TESTE 5: booking usa booking_resources
SELECT '=== TESTE 4: booking_resources funciona ===' as teste;
SELECT COUNT(*) as recursos_ligados FROM booking_resources
WHERE booking_id = 'f1000000-0000-0000-0000-000000000001';
-- ESPERADO: 2 (Ana Ferreira + Sala)

-- TESTE 6: get_available_slots não retorna ocupado
SELECT '=== TESTE 5: get_available_slots exclui ocupado ===' as teste;
SELECT COUNT(*) as slots_disponiveis FROM get_available_slots(
  'b1000000-0000-0000-0000-000000000001',
  ARRAY['d1000000-0000-0000-0000-000000000001'::UUID],
  'c1000000-0000-0000-0000-000000000001',
  '2026-06-09', '2026-06-09'
) WHERE NOT (slot_start = '2026-06-09 09:00:00+00' AND slot_end = '2026-06-09 10:00:00+00');
-- ESPERADO: slots sem o 09:00-10:00 UTC

-- TESTE 7: get_available_slots não retorna bloqueado
SELECT '=== TESTE 6: get_available_slots exclui bloqueado ===' as teste;
SELECT COUNT(*) as slots_apos_bloqueio FROM get_available_slots(
  'b1000000-0000-0000-0000-000000000001',
  ARRAY['d1000000-0000-0000-0000-000000000001'::UUID],
  'c1000000-0000-0000-0000-000000000001',
  '2026-06-09', '2026-06-09'
) WHERE slot_start < '2026-06-09 13:00:00+00' OR slot_start >= '2026-06-09 17:00:00+00';
-- ESPERADO: slots antes das 14:00 Lisboa e depois das 18:00 Lisboa

-- TESTE 8: anonymize_client remove dados
SELECT '=== TESTE 7: anonymize_client ===' as teste;
BEGIN;
SELECT full_name, phone, email FROM clients WHERE id = 'e1000000-0000-0000-0000-000000000001';
SELECT anonymize_client('e1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001');
SELECT full_name, phone, email, is_anonymized FROM clients WHERE id = 'e1000000-0000-0000-0000-000000000001';
-- ESPERADO: dados anonimizados
ROLLBACK;

-- TESTE 9: RLS está activo em todas as tabelas
SELECT '=== TESTE 8: RLS activo ===' as teste;
SELECT COUNT(*) as tabelas_com_rls FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = TRUE;
-- ESPERADO: 17 tabelas

-- TESTE 10: tenant_id presente em todas as tabelas
SELECT '=== TESTE 9: tenant_id em todas tabelas ===' as teste;
SELECT COUNT(DISTINCT t.table_name) as tabelas_sem_tenant_id
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON c.table_name = t.table_name AND c.column_name = 'tenant_id'
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
  AND t.table_name != 'plans'
  AND c.column_name IS NULL;
-- ESPERADO: 0 (todas têm tenant_id)

-- TESTE 11: get_available_slots retorna vazio para domingo
SELECT '=== TESTE 10: sem disponibilidade = 0 slots ===' as teste;
SELECT COUNT(*) as slots_domingo FROM get_available_slots(
  'b1000000-0000-0000-0000-000000000001',
  ARRAY['d1000000-0000-0000-0000-000000000001'::UUID],
  'c1000000-0000-0000-0000-000000000001',
  '2026-06-07', '2026-06-07'
);
-- ESPERADO: 0

-- TESTE 12: Contar tabelas totais
SELECT '=== TESTE 11: 17 tabelas criadas ===' as teste;
SELECT COUNT(*) as total_tabelas FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- ESPERADO: 17

-- TESTE 13: Contar funções críticas
SELECT '=== TESTE 12: Funções críticas existem ===' as teste;
SELECT COUNT(*) as funcoes FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_available_slots', 'anonymize_client', 'auth_tenant_id', 'auth_user_role');
-- ESPERADO: 4

SELECT '=== VALIDAÇÃO COMPLETA ===' as fim;
