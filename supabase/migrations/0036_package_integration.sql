-- =============================================================================
-- 0036 — INTEGRAÇÃO DE PACOTES (finanças + agenda)
--
-- 1. Venda de pacote (com preço) → lança RECEITA automática em
--    financial_transactions (como o pagamento de marcação já faz).
-- 2. Marcação CONCLUÍDA → desconta 1 sessão de um pacote ativo do cliente que
--    case com o serviço (ou genérico), preferindo o serviço específico e o mais
--    antigo (FIFO). O botão manual "Usar sessão" continua disponível para usos
--    fora de uma marcação (ex: walk-in).
-- =============================================================================

-- ── 1. Venda de pacote → receita ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_package_sale_to_income()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_currency TEXT;
BEGIN
  IF NEW.price IS NULL OR NEW.price <= 0 THEN
    RETURN NEW;
  END IF;

  v_currency := COALESCE((SELECT settings->>'currency' FROM tenants WHERE id = NEW.tenant_id), 'EUR');

  INSERT INTO financial_transactions
    (tenant_id, type, category, description, amount, currency, payment_method, transaction_date, client_id, created_by)
  VALUES
    (NEW.tenant_id, 'income', 'venda_produto', 'Venda de pacote: ' || NEW.name,
     NEW.price, v_currency, 'outro', CURRENT_DATE, NEW.client_id, NEW.created_by);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_package_sale_income ON client_packages;
CREATE TRIGGER trigger_package_sale_income
  AFTER INSERT ON client_packages
  FOR EACH ROW EXECUTE FUNCTION fn_package_sale_to_income();


-- ── 2. Marcação concluída → consome 1 sessão de pacote ───────────────────────
CREATE OR REPLACE FUNCTION fn_consume_package_on_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pkg_id UUID;
BEGIN
  -- só na transição PARA 'completed'
  IF NOT (NEW.status = 'completed' AND NEW.status IS DISTINCT FROM OLD.status) THEN
    RETURN NEW;
  END IF;

  -- pacote ativo do cliente, com saldo, que case com o serviço (ou genérico)
  SELECT id INTO v_pkg_id
  FROM client_packages
  WHERE tenant_id = NEW.tenant_id
    AND client_id = NEW.client_id
    AND status = 'active'
    AND used_sessions < total_sessions
    AND (service_id = NEW.service_id OR service_id IS NULL)
    AND (expires_at IS NULL OR expires_at >= CURRENT_DATE)
  ORDER BY (service_id = NEW.service_id) DESC, purchased_at ASC
  LIMIT 1
  FOR UPDATE;

  IF v_pkg_id IS NOT NULL THEN
    UPDATE client_packages SET used_sessions = used_sessions + 1 WHERE id = v_pkg_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_consume_package_on_complete ON bookings;
CREATE TRIGGER trigger_consume_package_on_complete
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION fn_consume_package_on_complete();
