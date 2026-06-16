-- =============================================================================
-- 0047 — ENDURECER get_available_slots (isolamento de disponibilidade)
--
-- Follow-up das 0044/0045/0046. A funcao (SECURITY DEFINER) recebia p_tenant_id
-- e nao o validava contra o chamador: um utilizador autenticado podia consultar
-- a disponibilidade (horas livres) de OUTRO tenant. Baixa severidade (sem PII),
-- mas e isolamento. Agora chamadas de utilizador so veem o proprio tenant; o
-- portal publico (service_role) e o sistema mantem-se. Corpo identico + guarda.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_available_slots(p_tenant_id uuid, p_resource_ids uuid[], p_service_id uuid, p_start_date date, p_end_date date, p_slot_interval_minutes integer DEFAULT 15)
 RETURNS TABLE(resource_id uuid, slot_start timestamp with time zone, slot_end timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_duration_minutes INTEGER;
  v_timezone         TEXT;
BEGIN
  -- Autorizacao (0047): chamadas de UTILIZADOR so podem ver a disponibilidade
  -- do PROPRIO tenant. Portal publico usa service_role (admin) e fica isento;
  -- chamadas de sistema sem JWT (auth_tenant_id NULL) tambem.
  IF COALESCE(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') <> 'service_role'
     AND auth_tenant_id() IS NOT NULL
     AND p_tenant_id IS DISTINCT FROM auth_tenant_id() THEN
    RAISE EXCEPTION 'Sem permissao para ver disponibilidade de outro tenant';
  END IF;

  -- Validar que o array de recursos não está vazio
  IF p_resource_ids IS NULL OR cardinality(p_resource_ids) = 0 THEN
    RETURN;  -- retorna tabela vazia sem erro
  END IF;

  -- Validar que o intervalo de datas é válido
  IF p_start_date > p_end_date THEN
    RAISE EXCEPTION 'data_inicio (%) não pode ser posterior a data_fim (%)', p_start_date, p_end_date;
  END IF;

  -- Validar o intervalo de slots
  IF p_slot_interval_minutes <= 0 THEN
    RAISE EXCEPTION 'slot_interval_minutes deve ser maior que 0';
  END IF;

  -- Obter duração do serviço e validar que pertence ao tenant
  SELECT s.duration_minutes
  INTO   v_duration_minutes
  FROM   services s
  WHERE  s.id         = p_service_id
    AND  s.tenant_id  = p_tenant_id
    AND  s.deleted_at IS NULL
    AND  s.is_active  = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Serviço % não encontrado, inactivo ou não pertence ao tenant %',
      p_service_id, p_tenant_id;
  END IF;

  -- Obter timezone do tenant para converter horas locais em UTC
  SELECT COALESCE(t.settings ->> 'timezone', 'UTC')
  INTO   v_timezone
  FROM   tenants t
  WHERE  t.id         = p_tenant_id
    AND  t.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant % não encontrado', p_tenant_id;
  END IF;

  -- -------------------------------------------------------------------------
  -- QUERY PRINCIPAL: gerar e filtrar slots disponíveis
  -- -------------------------------------------------------------------------
  RETURN QUERY
  WITH

  -- PASSO 1: Gerar série de dias no intervalo solicitado
  dias AS (
    SELECT generate_series(p_start_date, p_end_date, '1 day'::INTERVAL)::DATE AS dia
  ),

  -- PASSO 2: Para cada recurso e dia, obter as janelas de disponibilidade
  -- Converte hora local (TIME) para UTC (TIMESTAMPTZ) usando o timezone do tenant
  -- TIMEZONE(zone, timestamp) interpreta o timestamp como hora local de zone e retorna UTC
  janelas AS (
    SELECT
      ra.resource_id,
      TIMEZONE(v_timezone, (d.dia + ra.start_time)::TIMESTAMP) AS janela_inicio,
      TIMEZONE(v_timezone, (d.dia + ra.end_time)::TIMESTAMP)   AS janela_fim
    FROM resource_availability ra
    CROSS JOIN dias d
    WHERE ra.tenant_id   = p_tenant_id
      AND ra.resource_id = ANY(p_resource_ids)
      -- Filtrar pelo dia da semana (0=domingo ... 6=sábado)
      AND ra.day_of_week = EXTRACT(DOW FROM d.dia)::INTEGER
      -- Respeitar o período de validade da disponibilidade
      AND (ra.valid_from  IS NULL OR ra.valid_from  <= d.dia)
      AND (ra.valid_until IS NULL OR ra.valid_until >= d.dia)
  ),

  -- PASSO 3: Gerar todos os slots potenciais dentro de cada janela
  -- generate_series gera de janela_inicio até o último ponto onde o slot cabe
  -- Isto garante que nenhum slot ultrapassa o fim da janela
  slots_potenciais AS (
    SELECT
      j.resource_id,
      slot_inicio                                                              AS slot_start,
      slot_inicio + (v_duration_minutes || ' minutes')::INTERVAL              AS slot_end
    FROM janelas j
    CROSS JOIN LATERAL generate_series(
      j.janela_inicio,
      j.janela_fim - (v_duration_minutes || ' minutes')::INTERVAL,  -- último início possível
      (p_slot_interval_minutes || ' minutes')::INTERVAL             -- passo entre slots
    ) AS slot_inicio
  ),

  -- PASSO 4: Recolher bloqueios manuais que intersectam o período
  bloqueios AS (
    SELECT rb.resource_id, rb.start_at, rb.end_at
    FROM resource_blocks rb
    WHERE rb.tenant_id   = p_tenant_id
      AND rb.resource_id = ANY(p_resource_ids)
      -- Apenas bloqueios que intersectam o intervalo de datas pedido
      AND rb.start_at    < (p_end_date + 1)::TIMESTAMPTZ
      AND rb.end_at      > p_start_date::TIMESTAMPTZ
  ),

  -- PASSO 5: Recolher bookings confirmados que intersectam o período
  -- IMPORTANTE: usa booking_resources para obter o resource_id (bookings não tem resource_id directo)
  ocupados AS (
    SELECT br.resource_id, b.start_at, b.end_at
    FROM bookings b
    INNER JOIN booking_resources br
      ON  br.booking_id = b.id
      AND br.tenant_id  = p_tenant_id
    WHERE b.tenant_id  = p_tenant_id
      AND br.resource_id = ANY(p_resource_ids)
      -- Excluir marcações canceladas (horário fica disponível novamente)
      AND b.status      NOT IN ('cancelled')
      -- Apenas bookings que intersectam o intervalo de datas pedido
      AND b.start_at    < (p_end_date + 1)::TIMESTAMPTZ
      AND b.end_at      > p_start_date::TIMESTAMPTZ
  )

  -- PASSO 6: Retornar slots que não colidem com bloqueios nem com bookings
  -- Colisão temporal: dois eventos colidem se (A.start < B.end) AND (A.end > B.start)
  SELECT sp.resource_id, sp.slot_start, sp.slot_end
  FROM slots_potenciais sp
  WHERE
    -- Verificar que não colide com nenhum bloqueio manual
    NOT EXISTS (
      SELECT 1
      FROM bloqueios bl
      WHERE bl.resource_id = sp.resource_id
        AND bl.start_at    < sp.slot_end    -- bloqueio começa antes do slot acabar
        AND bl.end_at      > sp.slot_start  -- bloqueio acaba depois do slot começar
    )
    -- Verificar que não colide com nenhuma marcação existente
    AND NOT EXISTS (
      SELECT 1
      FROM ocupados oc
      WHERE oc.resource_id = sp.resource_id
        AND oc.start_at    < sp.slot_end    -- booking começa antes do slot acabar
        AND oc.end_at      > sp.slot_start  -- booking acaba depois do slot começar
    )
  ORDER BY sp.slot_start, sp.resource_id;

END;
$function$


