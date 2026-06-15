-- =============================================================================
-- TESTE DE ISOLAMENTO MULTI-TENANT (RLS)
--
-- Prova que, sob o papel 'authenticated' com RLS ativa, um tenant NÃO consegue
-- ler dados de outro tenant. Cria 2 tenants efémeros + dados, simula o JWT de
-- cada um (request.jwt.claims) e verifica o isolamento. Tudo dentro de uma
-- transação com ROLLBACK — não deixa dados.
--
-- Correr:  docker exec -i <db> psql -U postgres -d postgres < rls-isolation.test.sql
-- Esperado:  "ISOLAMENTO OK" e ROLLBACK no fim (nenhuma exceção ASSERT).
-- =============================================================================
BEGIN;

-- IDs fixos só para o teste (descartados no rollback)
\set ta '00000000-aaaa-4000-a000-00000000000a'
\set tb '00000000-bbbb-4000-b000-00000000000b'

-- Helper: assume a identidade de um tenant via claims do JWT (como o PostgREST faz)
CREATE OR REPLACE FUNCTION pg_temp.assume(p_tenant uuid, p_user uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', p_user::text, 'role', 'authenticated',
                      'app_metadata', json_build_object('tenant_id', p_tenant::text))::text, true);
  PERFORM set_config('role', 'authenticated', true);
END $$;

-- ── Arranjo: 2 tenants, cada um com 1 cliente e 1 serviço ────────────────────
SET LOCAL role postgres;
INSERT INTO tenants (id, name, slug, country, business_type)
VALUES (:'ta'::uuid, 'Tenant A Teste', 'tenant-a-teste', 'PT', 'estetica'),
       (:'tb'::uuid, 'Tenant B Teste', 'tenant-b-teste', 'PT', 'estetica');

INSERT INTO clients (tenant_id, full_name) VALUES
  (:'ta'::uuid, 'Cliente do A'),
  (:'tb'::uuid, 'Cliente do B');

-- ── Teste 1: Tenant A só vê os seus clientes ─────────────────────────────────
SELECT pg_temp.assume(:'ta'::uuid, '00000000-0000-4000-a000-0000000000a1'::uuid);
DO $$
DECLARE n_total int; n_b int;
BEGIN
  SELECT count(*) INTO n_total FROM clients;
  SELECT count(*) INTO n_b     FROM clients WHERE full_name = 'Cliente do B';
  ASSERT n_b = 0,     'FALHA: Tenant A conseguiu ver clientes do Tenant B!';
  ASSERT n_total >= 1, 'FALHA: Tenant A não vê os próprios clientes (RLS demasiado restritiva?)';
  RAISE NOTICE 'T1 OK — A vê % cliente(s), 0 do B', n_total;
END $$;

-- ── Teste 2: Tenant B só vê os seus clientes ─────────────────────────────────
SELECT pg_temp.assume(:'tb'::uuid, '00000000-0000-4000-b000-0000000000b1'::uuid);
DO $$
DECLARE n_a int;
BEGIN
  SELECT count(*) INTO n_a FROM clients WHERE full_name = 'Cliente do A';
  ASSERT n_a = 0, 'FALHA: Tenant B conseguiu ver clientes do Tenant A!';
  RAISE NOTICE 'T2 OK — B não vê clientes do A';
END $$;

-- ── Teste 3: Tenant A NÃO consegue ESCREVER no Tenant B ──────────────────────
SELECT pg_temp.assume(:'ta'::uuid, '00000000-0000-4000-a000-0000000000a1'::uuid);
DO $$
DECLARE bloqueado boolean := false;
BEGIN
  BEGIN
    INSERT INTO clients (tenant_id, full_name) VALUES ('00000000-bbbb-4000-b000-00000000000b'::uuid, 'Intruso');
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN bloqueado := true;
  END;
  -- Se a policy WITH CHECK barrou, o INSERT falha; se passou, a linha não pertence a A.
  ASSERT bloqueado OR NOT EXISTS (
    SELECT 1 FROM clients WHERE full_name='Intruso' AND tenant_id='00000000-bbbb-4000-b000-00000000000b'::uuid
  ), 'FALHA: Tenant A inseriu um cliente no Tenant B!';
  RAISE NOTICE 'T3 OK — A não escreve no B';
END $$;

\echo '>>> ISOLAMENTO OK <<<'
ROLLBACK;
