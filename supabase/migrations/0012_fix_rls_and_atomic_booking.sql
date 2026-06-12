-- =============================================================================
-- MIGRAÇÃO 0012: FIX RLS (tenants UPDATE, profiles SELECT own) + BOOKING ATÓMICO
-- Projecto: ExodoFlow AI
-- Descrição: Corrige dois bugs bloqueadores de RLS e adiciona RPCs transacionais
--            para criação/reagendamento de marcações sem double-booking.
--
-- BUG 1 (bloqueador): tenants só tinha policy SELECT. Todos os UPDATE do
--   onboarding (salvarEmpresa, salvarNicho, finalizarOnboarding) e do branding
--   falhavam silenciosamente com error=null e 0 linhas afectadas.
--
-- BUG 2 (bloqueador): profiles_select_same_tenant exige tenant_id no JWT.
--   Um utilizador cujo JWT ainda não tem tenant_id (sessão antiga, refresh
--   pendente) não conseguia ler o próprio perfil → dashboard e onboarding
--   quebravam em cascata.
--
-- BUG 3 (alto): criarBooking fazia 2 INSERTs separados sem transação nem
--   verificação de conflito → double-booking possível e bookings órfãos
--   (sem recurso) se o segundo INSERT falhasse.
-- =============================================================================


-- =============================================================================
-- PARTE 0: auth_tenant_id() com fallback ao profile
-- Nas versões recentes do Supabase a migration pode não conseguir actualizar
-- auth.users.raw_app_meta_data (ownership de supabase_auth_admin). Sem o
-- tenant_id no JWT, TODAS as policies RLS falhavam. Este fallback resolve o
-- tenant via profiles quando o JWT não o tem.
-- Segurança: profiles.tenant_id não é manipulável pelo cliente (WITH CHECK
-- impede alterar tenant_id) e a função é SECURITY DEFINER (não dispara RLS
-- recursivamente).
-- =============================================================================

CREATE OR REPLACE FUNCTION auth_tenant_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID,
    (SELECT tenant_id FROM profiles WHERE id = auth.uid() LIMIT 1)
  )
$$;

COMMENT ON FUNCTION auth_tenant_id() IS
  'Retorna o tenant_id do utilizador: primeiro do JWT app_metadata, com fallback ao profile. Usada em todas as políticas RLS.';


-- =============================================================================
-- PARTE 1: tenants — policy de UPDATE para OWNER
-- Decisão de arquitectura: updates de tenant via RLS controlado (não Edge
-- Function) — o onboarding e o branding correm no cliente com o JWT do owner.
-- =============================================================================

DROP POLICY IF EXISTS "tenants_update_owner" ON tenants;

CREATE POLICY "tenants_update_owner"
  ON tenants
  FOR UPDATE
  TO authenticated
  USING (
    id = auth_tenant_id()           -- apenas o próprio tenant
    AND deleted_at IS NULL          -- tenant activo
    AND auth_user_role() = 'owner'  -- apenas o proprietário
  )
  WITH CHECK (
    id = auth_tenant_id()           -- impede mover o registo para outro tenant
    AND deleted_at IS NULL
  );

COMMENT ON POLICY "tenants_update_owner" ON tenants IS
  'OWNER pode actualizar o próprio tenant (onboarding, branding, configurações). '
  'MANAGER/RECEPTIONIST/STAFF não podem. WITH CHECK impede alterar id para outro tenant.';


-- =============================================================================
-- PARTE 2: profiles — utilizador vê sempre o próprio perfil
-- Necessário para sessões cujo JWT ainda não tem tenant_id (pós-signup,
-- pré-refresh) e como defesa em profundidade no dashboard/onboarding layout.
-- =============================================================================

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;

CREATE POLICY "profiles_select_own"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

COMMENT ON POLICY "profiles_select_own" ON profiles IS
  'Utilizador vê sempre o próprio perfil, mesmo sem tenant_id no JWT. '
  'Complementa profiles_select_same_tenant (que cobre os colegas de tenant).';


-- =============================================================================
-- PARTE 3: create_booking() — criação atómica de marcação
-- Tudo numa única transacção: lock por recurso → verificação de conflito →
-- INSERT booking → INSERT booking_resources. SECURITY INVOKER: as policies
-- RLS de bookings/booking_resources continuam a aplicar-se.
-- =============================================================================

CREATE OR REPLACE FUNCTION create_booking(
  p_client_id    UUID,
  p_service_id   UUID,
  p_start_at     TIMESTAMPTZ,
  p_end_at       TIMESTAMPTZ,
  p_resource_ids UUID[],
  p_notes        TEXT DEFAULT NULL
)
RETURNS bookings
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID := auth_tenant_id();
  v_booking   bookings;
  v_rid       UUID;
  v_conflicts INT;
BEGIN
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant não identificado na sessão';
  END IF;

  IF p_resource_ids IS NULL OR array_length(p_resource_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'A marcação precisa de pelo menos um recurso';
  END IF;

  IF p_end_at <= p_start_at THEN
    RAISE EXCEPTION 'A hora de fim deve ser posterior à hora de início';
  END IF;

  -- Advisory lock por recurso (ordenado para evitar deadlock entre transacções
  -- concorrentes). Serializa criações simultâneas no mesmo recurso.
  FOR v_rid IN SELECT unnest(p_resource_ids) ORDER BY 1 LOOP
    PERFORM pg_advisory_xact_lock(hashtext(v_rid::text));
  END LOOP;

  -- Verificar sobreposição com marcações activas dos mesmos recursos
  SELECT COUNT(*) INTO v_conflicts
  FROM bookings b
  JOIN booking_resources br ON br.booking_id = b.id
  WHERE b.tenant_id   = v_tenant_id
    AND br.resource_id = ANY(p_resource_ids)
    AND b.status NOT IN ('cancelled', 'no_show')
    AND b.start_at < p_end_at
    AND b.end_at   > p_start_at;

  IF v_conflicts > 0 THEN
    RAISE EXCEPTION 'Horário indisponível: já existe uma marcação neste intervalo para o recurso seleccionado';
  END IF;

  -- Criar a marcação (status/source usam os defaults da tabela)
  INSERT INTO bookings (tenant_id, client_id, service_id, start_at, end_at, notes)
  VALUES (v_tenant_id, p_client_id, p_service_id, p_start_at, p_end_at, p_notes)
  RETURNING * INTO v_booking;

  -- Associar recursos na MESMA transacção — booking nunca fica órfão
  INSERT INTO booking_resources (tenant_id, booking_id, resource_id)
  SELECT v_tenant_id, v_booking.id, unnest(p_resource_ids);

  RETURN v_booking;
END;
$$;

COMMENT ON FUNCTION create_booking IS
  'Cria marcação + recursos atomicamente com advisory lock anti-double-booking. '
  'SECURITY INVOKER: respeita as policies RLS do utilizador.';

GRANT EXECUTE ON FUNCTION create_booking TO authenticated;


-- =============================================================================
-- PARTE 4: reschedule_booking() — reagendamento atómico
-- =============================================================================

CREATE OR REPLACE FUNCTION reschedule_booking(
  p_booking_id   UUID,
  p_start_at     TIMESTAMPTZ,
  p_end_at       TIMESTAMPTZ,
  p_resource_ids UUID[],
  p_notes        TEXT DEFAULT NULL
)
RETURNS bookings
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID := auth_tenant_id();
  v_booking   bookings;
  v_rid       UUID;
  v_conflicts INT;
BEGIN
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant não identificado na sessão';
  END IF;

  IF p_resource_ids IS NULL OR array_length(p_resource_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'A marcação precisa de pelo menos um recurso';
  END IF;

  IF p_end_at <= p_start_at THEN
    RAISE EXCEPTION 'A hora de fim deve ser posterior à hora de início';
  END IF;

  FOR v_rid IN SELECT unnest(p_resource_ids) ORDER BY 1 LOOP
    PERFORM pg_advisory_xact_lock(hashtext(v_rid::text));
  END LOOP;

  -- Conflitos: excluir a própria marcação que está a ser reagendada
  SELECT COUNT(*) INTO v_conflicts
  FROM bookings b
  JOIN booking_resources br ON br.booking_id = b.id
  WHERE b.tenant_id    = v_tenant_id
    AND b.id          <> p_booking_id
    AND br.resource_id = ANY(p_resource_ids)
    AND b.status NOT IN ('cancelled', 'no_show')
    AND b.start_at < p_end_at
    AND b.end_at   > p_start_at;

  IF v_conflicts > 0 THEN
    RAISE EXCEPTION 'Horário indisponível: já existe uma marcação neste intervalo para o recurso seleccionado';
  END IF;

  UPDATE bookings
  SET start_at = p_start_at,
      end_at   = p_end_at,
      status   = 'confirmed',
      notes    = COALESCE(p_notes, notes)
  WHERE id = p_booking_id
    AND tenant_id = v_tenant_id
  RETURNING * INTO v_booking;

  IF v_booking.id IS NULL THEN
    RAISE EXCEPTION 'Marcação não encontrada ou sem permissão para reagendar';
  END IF;

  -- Substituir recursos na mesma transacção — nunca fica sem recursos
  DELETE FROM booking_resources WHERE booking_id = p_booking_id;

  INSERT INTO booking_resources (tenant_id, booking_id, resource_id)
  SELECT v_tenant_id, p_booking_id, unnest(p_resource_ids);

  RETURN v_booking;
END;
$$;

COMMENT ON FUNCTION reschedule_booking IS
  'Reagenda marcação + substitui recursos atomicamente com advisory lock. '
  'SECURITY INVOKER: respeita as policies RLS do utilizador.';

GRANT EXECUTE ON FUNCTION reschedule_booking TO authenticated;
