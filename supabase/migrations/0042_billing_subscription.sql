-- =============================================================================
-- 0042 — ESTADO DE SUBSCRIÇÃO (billing)
--
-- Acrescenta o estado de subscrição ao tenant. O pagamento real é feito via
-- Stripe (seam por fetch, sem SDK), mas o sistema funciona em modo SIMULADO
-- (BILLING_MOCK) ativando o plano diretamente — como os restantes serviços.
--
-- A escrita destes campos é feita SÓ server-side (route handler de checkout/
-- webhook, com service_role). Não há policy de UPDATE para o cliente.
-- =============================================================================

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trialing'
    CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'none')),
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT
    CHECK (billing_cycle IN ('monthly', 'yearly') OR billing_cycle IS NULL),
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

COMMENT ON COLUMN tenants.subscription_status IS 'trialing | active | past_due | canceled | none — estado de subscrição do tenant.';
COMMENT ON COLUMN tenants.stripe_customer_id   IS 'ID do cliente no Stripe (NULL em modo simulado).';

-- Índice para o webhook localizar o tenant pela subscrição do Stripe.
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_sub ON tenants (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- ── Integridade de billing: owner NÃO pode auto-ativar o plano ───────────────
-- A policy "tenants_update_owner" deixa o owner atualizar o próprio tenant
-- (nome, settings, etc.). Sem proteção, poderia também escrever
-- subscription_status='active' e ter o plano de graça. Um REVOKE ao nível da
-- coluna não basta (o GRANT ao nível da tabela da 0031 prevalece), por isso
-- usamos um TRIGGER: os campos de billing só mudam em sessões service_role
-- (handlers de checkout/webhook server-side) ou postgres (migrações/admin).
CREATE OR REPLACE FUNCTION fn_guard_tenant_billing()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (NEW.subscription_status    IS DISTINCT FROM OLD.subscription_status
   OR NEW.billing_cycle          IS DISTINCT FROM OLD.billing_cycle
   OR NEW.current_period_end     IS DISTINCT FROM OLD.current_period_end
   OR NEW.stripe_customer_id     IS DISTINCT FROM OLD.stripe_customer_id
   OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id)
   AND current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'Campos de subscrição só podem ser alterados pelo sistema de pagamento (service_role).';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_guard_tenant_billing ON tenants;
CREATE TRIGGER trigger_guard_tenant_billing
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION fn_guard_tenant_billing();
