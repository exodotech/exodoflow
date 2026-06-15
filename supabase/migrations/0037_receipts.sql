-- =============================================================================
-- 0037 — RECIBOS (comprovativo de pagamento)
--
-- Emite um recibo NUMERADO a partir de uma RECEITA (financial_transactions.income).
-- NÃO é fatura certificada — é um comprovativo interno de pagamento para entregar
-- ao cliente. A numeração é sequencial por tenant e por ano (ex: 2026/0001).
--
-- O recibo guarda um SNAPSHOT imutável (emissor + cliente + valor) no momento da
-- emissão, para que continue válido mesmo que a empresa mude de dados depois.
-- =============================================================================

-- ── 1. Contador sequencial por tenant + ano ──────────────────────────────────
CREATE TABLE IF NOT EXISTS receipt_counters (
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  year        INT  NOT NULL,
  last_number INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, year)
);

-- ── 2. Recibos ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS receipts (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  transaction_id UUID         NOT NULL UNIQUE REFERENCES financial_transactions(id) ON DELETE CASCADE,
  year           INT          NOT NULL,
  number         INT          NOT NULL,                  -- sequencial dentro de (tenant, year)
  amount         NUMERIC(12,2) NOT NULL,
  currency       TEXT         NOT NULL,
  description    TEXT,
  payment_method TEXT         NOT NULL,
  issued_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  -- snapshot do EMISSOR (empresa) no momento da emissão
  issuer_name    TEXT         NOT NULL,
  issuer_tax_id  TEXT,
  issuer_address TEXT,
  -- snapshot do CLIENTE (pode ser nulo: walk-in / sem cliente)
  client_name    TEXT,
  client_tax_id  TEXT,
  created_by     UUID         REFERENCES profiles(id),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, year, number)
);

COMMENT ON TABLE receipts IS 'Comprovativo de pagamento numerado (por tenant/ano). NÃO é fatura certificada.';

CREATE INDEX IF NOT EXISTS idx_receipts_tenant ON receipts (tenant_id, issued_at DESC);

-- ── 3. RLS: só owner/manager do tenant (igual às finanças) ───────────────────
ALTER TABLE receipts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "receipts_select_owner_manager"
  ON receipts FOR SELECT
  USING (tenant_id = auth_tenant_id() AND auth_user_role() IN ('owner', 'manager'));
-- Sem INSERT/UPDATE/DELETE diretos: emissão só via RPC (numeração atómica).

CREATE POLICY "receipt_counters_select_owner_manager"
  ON receipt_counters FOR SELECT
  USING (tenant_id = auth_tenant_id() AND auth_user_role() IN ('owner', 'manager'));

-- ── 4. RPC: emitir recibo (atómico, idempotente) ─────────────────────────────
-- SECURITY DEFINER: gere a numeração ignorando RLS, mas valida o tenant/role do
-- chamador. Se já existir recibo para a transação, devolve o existente (idempotente).
CREATE OR REPLACE FUNCTION emitir_recibo(p_transaction_id UUID)
RETURNS receipts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant   UUID := auth_tenant_id();
  v_role     TEXT := auth_user_role();
  v_tx       financial_transactions%ROWTYPE;
  v_t        tenants%ROWTYPE;
  v_year     INT  := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  v_num      INT;
  v_result   receipts%ROWTYPE;
  v_addr     JSONB;
  v_addr_txt TEXT;
  v_cli_name TEXT;
  v_cli_tax  TEXT;
BEGIN
  IF v_tenant IS NULL OR v_role NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'Sem permissão para emitir recibos';
  END IF;

  SELECT * INTO v_tx FROM financial_transactions
   WHERE id = p_transaction_id AND tenant_id = v_tenant AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lançamento não encontrado';
  END IF;
  IF v_tx.type <> 'income' THEN
    RAISE EXCEPTION 'Só é possível emitir recibo de uma entrada (receita)';
  END IF;

  -- idempotente: já emitido?
  SELECT * INTO v_result FROM receipts WHERE transaction_id = p_transaction_id;
  IF FOUND THEN
    RETURN v_result;
  END IF;

  SELECT * INTO v_t FROM tenants WHERE id = v_tenant;
  v_addr := COALESCE(v_t.address, '{}'::jsonb);
  v_addr_txt := NULLIF(TRIM(BOTH ', ' FROM CONCAT_WS(', ',
    NULLIF(v_addr->>'street', ''),
    NULLIF(v_addr->>'postal_code', ''),
    NULLIF(v_addr->>'city', ''),
    NULLIF(v_addr->>'region', ''))), '');

  IF v_tx.client_id IS NOT NULL THEN
    SELECT full_name, nif INTO v_cli_name, v_cli_tax FROM clients WHERE id = v_tx.client_id;
  END IF;

  -- numeração atómica por (tenant, ano)
  INSERT INTO receipt_counters (tenant_id, year, last_number)
  VALUES (v_tenant, v_year, 1)
  ON CONFLICT (tenant_id, year)
  DO UPDATE SET last_number = receipt_counters.last_number + 1
  RETURNING last_number INTO v_num;

  INSERT INTO receipts (
    tenant_id, transaction_id, year, number, amount, currency, description, payment_method,
    issuer_name, issuer_tax_id, issuer_address, client_name, client_tax_id, created_by
  ) VALUES (
    v_tenant, p_transaction_id, v_year, v_num, v_tx.amount, v_tx.currency, v_tx.description, v_tx.payment_method,
    v_t.name, v_t.settings->>'tax_id', v_addr_txt, v_cli_name, v_cli_tax, auth.uid()
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION emitir_recibo(UUID) IS 'Emite (ou devolve) o recibo numerado de uma receita. Atómico e idempotente.';
