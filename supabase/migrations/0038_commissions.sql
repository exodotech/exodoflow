-- =============================================================================
-- 0038 — COMISSÕES POR PROFISSIONAL
--
-- Cada colaborador (resource type='staff') pode ter uma percentagem de comissão.
-- O relatório calcula, para um período, quanto cada profissional gerou em
-- serviços CONCLUÍDOS e a comissão devida (base × %). Controlo interno — apoia
-- o cálculo de pagamentos; não é processamento de salários oficial.
-- =============================================================================

-- ── 1. % de comissão por recurso (só faz sentido em staff) ───────────────────
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS commission_percent NUMERIC(5,2) NOT NULL DEFAULT 0
    CHECK (commission_percent >= 0 AND commission_percent <= 100);

COMMENT ON COLUMN resources.commission_percent IS 'Percentagem de comissão do colaborador sobre serviços concluídos (0–100). Só relevante em type=staff.';

-- ── 2. RPC: relatório de comissões por período ───────────────────────────────
-- SECURITY DEFINER: agrega ignorando RLS, mas valida tenant + role do chamador.
-- Base de cálculo: marcações 'completed' no período, valor = price_charged ou,
-- em falta, o preço do serviço. Se a marcação tiver vários staff, cada um recebe
-- comissão sobre o valor (cenário típico é 1 profissional por marcação).
CREATE OR REPLACE FUNCTION relatorio_comissoes(p_from DATE, p_to DATE)
RETURNS TABLE (
  resource_id        UUID,
  resource_name      TEXT,
  commission_percent NUMERIC,
  total_servicos     BIGINT,
  total_faturado     NUMERIC,
  total_comissao     NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant UUID := auth_tenant_id();
  v_role   TEXT := auth_user_role();
BEGIN
  IF v_tenant IS NULL OR v_role NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'Sem permissão para ver comissões';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.name,
    r.commission_percent,
    COUNT(b.id),
    COALESCE(SUM(COALESCE(b.price_charged, s.price, 0)), 0)::NUMERIC(12,2),
    COALESCE(SUM(COALESCE(b.price_charged, s.price, 0) * r.commission_percent / 100), 0)::NUMERIC(12,2)
  FROM resources r
  JOIN booking_resources br ON br.resource_id = r.id
  JOIN bookings b           ON b.id = br.booking_id
  JOIN services s           ON s.id = b.service_id
  WHERE r.tenant_id = v_tenant
    AND r.type = 'staff'
    AND r.deleted_at IS NULL
    AND b.status = 'completed'
    AND b.start_at >= p_from::timestamptz
    AND b.start_at <  (p_to + 1)::timestamptz   -- inclui o dia p_to inteiro
  GROUP BY r.id, r.name, r.commission_percent
  HAVING COUNT(b.id) > 0
  ORDER BY total_comissao DESC;
END;
$$;

COMMENT ON FUNCTION relatorio_comissoes(DATE, DATE) IS 'Comissões por profissional num período (marcações concluídas). Controlo interno.';
