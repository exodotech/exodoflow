-- =============================================================================
-- 0050 — MARCAÇÃO PÚBLICA ATÓMICA (anti double-booking no portal)
--
-- O dashboard cria marcações via create_booking() (advisory lock + verificação
-- de overlap, atómico). O PORTAL PÚBLICO fazia check-then-act (verificava o slot
-- e depois inseria em bruto), sem lock nem overlap no INSERT — dois clientes a
-- marcar o mesmo slot em simultâneo passavam ambos (double-booking).
--
-- Esta função replica a garantia do create_booking, mas recebe o tenant
-- EXPLICITAMENTE (o portal corre com service_role, sem sessão). É sistema-only.
-- =============================================================================
CREATE OR REPLACE FUNCTION create_public_booking(
  p_tenant_id   UUID,
  p_client_id   UUID,
  p_service_id  UUID,
  p_start_at    TIMESTAMPTZ,
  p_end_at      TIMESTAMPTZ,
  p_resource_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id UUID;
BEGIN
  IF p_end_at <= p_start_at THEN
    RAISE EXCEPTION 'A hora de fim deve ser posterior à hora de início';
  END IF;

  -- Serializa pedidos concorrentes para o MESMO recurso (igual ao create_booking).
  PERFORM pg_advisory_xact_lock(hashtext(p_resource_id::text));

  -- Overlap (atómico, sob o lock): mesma regra do dashboard.
  IF EXISTS (
    SELECT 1
    FROM bookings b
    JOIN booking_resources br ON br.booking_id = b.id
    WHERE br.resource_id = p_resource_id
      AND b.tenant_id    = p_tenant_id
      AND b.status NOT IN ('cancelled', 'no_show')
      AND b.start_at < p_end_at
      AND b.end_at   > p_start_at
  ) THEN
    RAISE EXCEPTION 'Horário indisponível: já existe uma marcação neste intervalo para o recurso seleccionado';
  END IF;

  INSERT INTO bookings (tenant_id, client_id, service_id, start_at, end_at, status, source)
  VALUES (p_tenant_id, p_client_id, p_service_id, p_start_at, p_end_at, 'pending', 'booking_portal')
  RETURNING id INTO v_booking_id;

  INSERT INTO booking_resources (tenant_id, booking_id, resource_id)
  VALUES (p_tenant_id, v_booking_id, p_resource_id);

  RETURN v_booking_id;
END;
$$;

COMMENT ON FUNCTION create_public_booking(UUID, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) IS
  'Cria uma marcação do portal público de forma atómica (advisory lock + overlap). Sistema apenas.';

-- Sistema apenas (o portal usa o service_role). Não exposta a anon/authenticated.
REVOKE ALL ON FUNCTION create_public_booking(UUID, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_public_booking(UUID, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID)
  TO service_role;
