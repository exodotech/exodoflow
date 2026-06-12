-- =============================================================================
-- MIGRAÇÃO 0029: MÓDULO FINANCEIRO (F2)
-- Projecto: ExodoFlow AI
-- Descrição: Controlo interno de caixa (entradas/saídas). NÃO é contabilidade
--   oficial nem faturação certificada. Inclui:
--     1. financial_transactions (income/expense, soft-delete, RLS owner/manager)
--     2. estado de pagamento nas marcações (payment_status + amount_paid)
--     3. trigger: marcação 'paid' gera uma RECEITA automática (sem duplicar)
--
-- Não-destrutivo: cria tabela nova + adiciona colunas + alarga nada que remova.
-- RLS na mesma migração (regra do projeto).
-- =============================================================================

-- ── 1. financial_transactions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financial_transactions (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type             TEXT         NOT NULL CHECK (type IN ('income', 'expense')),
  category         TEXT         NOT NULL,
  description      TEXT,
  amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),  -- sempre POSITIVO; type define entrada/saída
  currency         TEXT         NOT NULL,                       -- moeda do tenant no momento
  payment_method   TEXT         NOT NULL,
  transaction_date DATE         NOT NULL DEFAULT CURRENT_DATE,
  booking_id       UUID         REFERENCES bookings(id) ON DELETE SET NULL,
  client_id        UUID         REFERENCES clients(id)  ON DELETE SET NULL,
  created_by       UUID         REFERENCES profiles(id),        -- NULL = automático (trigger)
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ                                  -- soft-delete (histórico preservado)
);

COMMENT ON TABLE  financial_transactions          IS 'Controlo interno de caixa por tenant. NÃO é contabilidade oficial nem faturação certificada.';
COMMENT ON COLUMN financial_transactions.amount   IS 'Valor sempre positivo; a coluna type (income/expense) define o sinal.';
COMMENT ON COLUMN financial_transactions.currency IS 'Moeda do tenant (deriva do país) no momento do lançamento.';
COMMENT ON COLUMN financial_transactions.created_by IS 'Autor do lançamento; NULL quando criado automaticamente pelo trigger de pagamento.';

CREATE TRIGGER trigger_financial_transactions_updated_at
  BEFORE UPDATE ON financial_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 2. Row Level Security: SÓ owner/manager do tenant (staff/recepção sem acesso) ─
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fin_tx_select_owner_manager"
  ON financial_transactions FOR SELECT
  USING (tenant_id = auth_tenant_id() AND auth_user_role() IN ('owner', 'manager'));

CREATE POLICY "fin_tx_insert_owner_manager"
  ON financial_transactions FOR INSERT
  WITH CHECK (tenant_id = auth_tenant_id() AND auth_user_role() IN ('owner', 'manager'));

CREATE POLICY "fin_tx_update_owner_manager"
  ON financial_transactions FOR UPDATE
  USING (tenant_id = auth_tenant_id() AND auth_user_role() IN ('owner', 'manager'))
  WITH CHECK (tenant_id = auth_tenant_id() AND auth_user_role() IN ('owner', 'manager'));
-- Sem policy de DELETE: apaga-se por soft-delete (UPDATE deleted_at). Hard delete bloqueado.

-- ── 3. Índices ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fin_tx_tenant_date ON financial_transactions (tenant_id, transaction_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fin_tx_type        ON financial_transactions (tenant_id, type)                 WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fin_tx_booking     ON financial_transactions (booking_id)                      WHERE booking_id IS NOT NULL;

-- ── 4. Estado de pagamento nas marcações ─────────────────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'partial', 'cancelled_unpaid')),
  ADD COLUMN IF NOT EXISTS amount_paid    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0);

COMMENT ON COLUMN bookings.payment_status IS 'pending | paid | partial | cancelled_unpaid — controlo de caixa interno.';
COMMENT ON COLUMN bookings.amount_paid    IS 'Total já pago da marcação (para pagamentos parciais).';

-- ── 5. Trigger: marcação 'paid' gera RECEITA automática (sem duplicar) ────────
-- SECURITY DEFINER: corre como dono da função (ignora RLS), por isso uma recepção
-- que marque a marcação como paga também gera a receita — mas só o owner/manager
-- vê/edita as finanças. Dedup por booking_id (não cria duas receitas da mesma marcação).
CREATE OR REPLACE FUNCTION fn_booking_payment_to_income()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount   NUMERIC(12,2);
  v_currency TEXT;
BEGIN
  -- Só na transição PARA 'paid' (evita repetir em updates subsequentes).
  IF NEW.payment_status = 'paid' AND NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    -- Valor: preço cobrado na marcação ou, em falta, o preço do serviço.
    v_amount := COALESCE(NEW.price_charged, (SELECT price FROM services WHERE id = NEW.service_id), 0);
    IF v_amount IS NULL OR v_amount <= 0 THEN
      RETURN NEW;   -- sem valor → nada a lançar
    END IF;

    -- Não duplicar: já existe receita (não apagada) para esta marcação?
    IF EXISTS (
      SELECT 1 FROM financial_transactions
      WHERE booking_id = NEW.id AND type = 'income' AND deleted_at IS NULL
    ) THEN
      RETURN NEW;
    END IF;

    v_currency := COALESCE((SELECT settings->>'currency' FROM tenants WHERE id = NEW.tenant_id), 'EUR');

    INSERT INTO financial_transactions
      (tenant_id, type, category, description, amount, currency, payment_method, transaction_date, booking_id, client_id, created_by)
    VALUES
      (NEW.tenant_id, 'income', 'servico', 'Pagamento de marcação (automático)', v_amount, v_currency, 'outro', CURRENT_DATE, NEW.id, NEW.client_id, NULL);
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_booking_payment_to_income() IS 'Cria 1 receita ao marcar a marcação como paga (dedup por booking_id). NÃO é faturação oficial.';

DROP TRIGGER IF EXISTS trigger_booking_payment_income ON bookings;
CREATE TRIGGER trigger_booking_payment_income
  AFTER UPDATE OF payment_status ON bookings
  FOR EACH ROW EXECUTE FUNCTION fn_booking_payment_to_income();
