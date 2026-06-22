-- =============================================================================
-- ExodoFlow Pro — SEED DE PRODUÇÃO
-- Aplica APENAS os planos de preço. SEM utilizadores, SEM tenants de teste.
--
-- Como usar:
--   supabase db push (para aplicar migrations)
--   Depois colar este ficheiro no SQL Editor do Supabase Cloud
--   OU: psql <CONNECTION_STRING> -f supabase/seed-production.sql
--
-- NUNCA aplicar seed.sql (development) em produção — tem utilizadores de teste.
-- =============================================================================

-- Planos de preço (UPSERT — seguro de re-correr)
INSERT INTO plans (id, name, slug, price_monthly, price_yearly, max_resources, max_clients, features, sort_order)
VALUES
  (
    'a1000000-0000-0000-0000-000000000001',
    'Gratuito',
    'free',
    0.00, 0.00,
    2,    -- 2 recursos máx
    50,   -- 50 clientes máx
    '{"booking_portal": true, "whatsapp_simulator": false, "ai": false, "price_brl_monthly": 0, "price_brl_yearly": 0}',
    1
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    'Starter',
    'starter',
    20.00, 200.00,
    5, 500,
    '{"booking_portal": true, "whatsapp_simulator": true, "ai": false, "price_brl_monthly": 79, "price_brl_yearly": 790}',
    2
  ),
  (
    'a1000000-0000-0000-0000-000000000003',
    'Pro',
    'pro',
    40.00, 400.00,
    NULL,  -- ilimitado
    NULL,  -- ilimitado
    '{"booking_portal": true, "whatsapp_simulator": true, "ai": true, "price_brl_monthly": 159, "price_brl_yearly": 1590}',
    3
  )
ON CONFLICT (id) DO UPDATE
  SET name          = EXCLUDED.name,
      slug          = EXCLUDED.slug,
      price_monthly = EXCLUDED.price_monthly,
      price_yearly  = EXCLUDED.price_yearly,
      max_resources = EXCLUDED.max_resources,
      max_clients   = EXCLUDED.max_clients,
      features      = EXCLUDED.features,
      sort_order    = EXCLUDED.sort_order;

-- Verificação — deve mostrar 3 linhas: Gratuito, Starter, Pro
SELECT id, name, slug, price_monthly, price_yearly FROM plans ORDER BY sort_order;
