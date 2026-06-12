-- =============================================================================
-- MIGRAÇÃO 0003: FUNÇÕES DE NEGÓCIO
-- Projeto: ExodoFlow AI
-- Descrição: Funções SQL que encapsulam lógica de negócio crítica.
--            Estas funções são a única interface que a camada de IA pode usar
--            para consultar disponibilidade — nunca consulta tabelas directamente.
-- =============================================================================


-- =============================================================================
-- FUNÇÃO AUXILIAR: auth_tenant_id()
-- Extrai o tenant_id do JWT do utilizador autenticado.
-- O tenant_id é injectado no app_metadata pelo processo de onboarding.
-- Usada em todas as políticas RLS para identificar o tenant do utilizador.
-- =============================================================================
CREATE OR REPLACE FUNCTION auth_tenant_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER  -- executa como proprietário da função, não como chamador
STABLE            -- mesmo resultado para o mesmo JWT na mesma transacção
SET search_path = public, auth
AS $$
  -- Extrai tenant_id do app_metadata do JWT
  -- O app_metadata é definido server-side (Edge Function de onboarding) e não pode ser alterado pelo cliente
  SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID
$$;

COMMENT ON FUNCTION auth_tenant_id() IS 'Retorna o tenant_id do utilizador autenticado via JWT app_metadata. Usada em políticas RLS.';


-- =============================================================================
-- FUNÇÃO AUXILIAR: auth_user_role()
-- Retorna o papel (role) do utilizador autenticado no seu tenant.
-- Usada nas políticas RLS para distinguir owner/admin de staff.
-- =============================================================================
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT role
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1
$$;

COMMENT ON FUNCTION auth_user_role() IS 'Retorna o role do utilizador autenticado (owner/admin/staff). Usada em políticas RLS.';


-- =============================================================================
-- FUNÇÃO: get_available_slots()
-- Calcula os horários disponíveis para um serviço num intervalo de datas.
--
-- REGRA FUNDAMENTAL DE ARQUITECTURA:
--   A IA APENAS pode chamar esta função.
--   A IA NUNCA pode consultar directamente: bookings, resource_blocks, resource_availability.
--   Isto garante que a IA não tem informação suficiente para criar marcações autónomas.
--
-- Parâmetros:
--   p_tenant_id              - ID do tenant
--   p_resource_ids           - Array de IDs de recursos a verificar
--   p_service_id             - ID do serviço (para obter a duração)
--   p_start_date             - Data de início da pesquisa
--   p_end_date               - Data de fim da pesquisa
--   p_slot_interval_minutes  - Intervalo entre slots em minutos (default: 15)
--
-- Retorna: tabela com (resource_id, slot_start, slot_end) para cada slot disponível
--
-- Lógica:
--   1. Obtém duração do serviço
--   2. Obtém timezone do tenant (horários locais → UTC)
--   3. Para cada dia no intervalo, gera janelas de disponibilidade (resource_availability)
--   4. Dentro de cada janela, gera slots possíveis a cada p_slot_interval_minutes
--   5. Filtra slots que colidem com resource_blocks (bloqueios manuais)
--   6. Filtra slots que colidem com bookings existentes (via booking_resources)
--   7. Retorna apenas os slots livres
-- =============================================================================
CREATE OR REPLACE FUNCTION get_available_slots(
  p_tenant_id             UUID,
  p_resource_ids          UUID[],
  p_service_id            UUID,
  p_start_date            DATE,
  p_end_date              DATE,
  p_slot_interval_minutes INTEGER DEFAULT 15
)
RETURNS TABLE (
  resource_id  UUID,
  slot_start   TIMESTAMPTZ,
  slot_end     TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER  -- executa como superuser para ler todas as tabelas necessárias
STABLE
SET search_path = public
AS $$
DECLARE
  v_duration_minutes INTEGER;
  v_timezone         TEXT;
BEGIN
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
$$;

COMMENT ON FUNCTION get_available_slots(UUID, UUID[], UUID, DATE, DATE, INTEGER) IS
  'Calcula horários disponíveis por recurso. Interface única da IA para consulta de disponibilidade. '
  'A IA lê este resultado — nunca escreve em bookings directamente.';


-- =============================================================================
-- FUNÇÃO: anonymize_client()
-- Remove dados pessoais de um cliente por solicitação RGPD/LGPD.
-- Preserva o histórico estatístico (bookings, métricas) mas remove PII.
-- Regista a anonimização no audit_log para conformidade legal.
--
-- Parâmetros:
--   p_client_id  - ID do cliente a anonimizar
--   p_tenant_id  - ID do tenant (validação de segurança)
--
-- Efeitos:
--   - full_name  → "Cliente Anónimo XXXXXXXX"
--   - phone      → NULL
--   - email      → NULL
--   - birth_date → NULL
--   - nif        → NULL
--   - notes      → NULL
--   - tags       → []
--   - is_anonymized → TRUE
-- =============================================================================
CREATE OR REPLACE FUNCTION anonymize_client(
  p_client_id UUID,
  p_tenant_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER  -- precisa escrever em audit_logs sem política de INSERT para utilizadores
SET search_path = public
AS $$
DECLARE
  -- Sufixo anónimo: primeiros 8 caracteres do UUID para referência interna
  v_anon_suffix TEXT := LEFT(p_client_id::TEXT, 8);
  v_old_data    JSONB;
BEGIN
  -- Verificar que o cliente existe, pertence ao tenant e não foi já anonimizado
  IF NOT EXISTS (
    SELECT 1
    FROM   clients
    WHERE  id             = p_client_id
      AND  tenant_id      = p_tenant_id
      AND  deleted_at     IS NULL
  ) THEN
    RAISE EXCEPTION 'Cliente % não encontrado ou não pertence ao tenant %',
      p_client_id, p_tenant_id;
  END IF;

  -- Verificar que o cliente ainda não foi anonimizado (idempotência)
  IF EXISTS (
    SELECT 1
    FROM   clients
    WHERE  id            = p_client_id
      AND  is_anonymized = TRUE
  ) THEN
    RAISE EXCEPTION 'Cliente % já foi anonimizado anteriormente', p_client_id;
  END IF;

  -- Guardar dados actuais para o audit_log (snapshot antes da alteração)
  SELECT jsonb_build_object(
    'full_name',  full_name,
    'phone',      phone,
    'email',      email,
    'birth_date', birth_date,
    'nif',        nif
  )
  INTO v_old_data
  FROM clients
  WHERE id = p_client_id;

  -- Substituir todos os dados pessoais identificáveis por valores anónimos
  UPDATE clients
  SET
    full_name      = 'Cliente Anónimo ' || v_anon_suffix,
    phone          = NULL,
    email          = NULL,
    birth_date     = NULL,
    nif            = NULL,
    notes          = NULL,   -- notas podem conter PII (ex: "alergia ao produto X, filha da Dra. Silva")
    tags           = '{}',
    is_anonymized  = TRUE,
    updated_at     = NOW()
  WHERE id        = p_client_id
    AND tenant_id = p_tenant_id;

  -- Revogar todos os consentimentos activos (dados pessoais removidos = consentimentos obsoletos)
  UPDATE legal_consents
  SET   revoked_at = NOW()
  WHERE client_id  = p_client_id
    AND tenant_id  = p_tenant_id
    AND revoked_at IS NULL;

  -- Registar a anonimização no audit_log para conformidade RGPD/LGPD
  -- Este registo é prova de que o pedido foi cumprido
  INSERT INTO audit_logs (
    tenant_id,
    actor_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    metadata
  ) VALUES (
    p_tenant_id,
    auth.uid(),                           -- quem executou (NULL se chamado por sistema)
    'client.anonymized',
    'clients',
    p_client_id,
    v_old_data,                           -- snapshot dos dados antes (para auditoria interna)
    jsonb_build_object(
      'is_anonymized', TRUE,
      'full_name', 'Cliente Anónimo ' || v_anon_suffix
    ),
    jsonb_build_object(
      'reason',        'RGPD/LGPD — direito ao apagamento',
      'anonymized_at', NOW()
    )
  );

END;
$$;

COMMENT ON FUNCTION anonymize_client(UUID, UUID) IS
  'Remove dados pessoais (PII) de um cliente por obrigação RGPD/LGPD. '
  'Preserva histórico estatístico. Regista em audit_logs. Idempotente.';


-- =============================================================================
-- FUNÇÃO: log_audit_event()
-- Função auxiliar para registar eventos de auditoria de forma consistente.
-- Chamada por outros triggers e funções do sistema.
-- =============================================================================
CREATE OR REPLACE FUNCTION log_audit_event(
  p_tenant_id  UUID,
  p_action     TEXT,
  p_table_name TEXT,
  p_record_id  UUID,
  p_old_data   JSONB DEFAULT NULL,
  p_new_data   JSONB DEFAULT NULL,
  p_metadata   JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO audit_logs (
    tenant_id,
    actor_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    metadata
  ) VALUES (
    p_tenant_id,
    auth.uid(),    -- utilizador autenticado actual (NULL se chamado por sistema)
    p_action,
    p_table_name,
    p_record_id,
    p_old_data,
    p_new_data,
    p_metadata
  );
END;
$$;

COMMENT ON FUNCTION log_audit_event(UUID, TEXT, TEXT, UUID, JSONB, JSONB, JSONB) IS
  'Helper para registar eventos em audit_logs de forma consistente.';


-- =============================================================================
-- FUNÇÃO: get_tenant_feature_flag()
-- Verifica se uma feature flag está activa para um tenant.
-- Chamada pelo backend antes de activar funcionalidades opcionais.
-- =============================================================================
CREATE OR REPLACE FUNCTION get_tenant_feature_flag(
  p_tenant_id UUID,
  p_flag_name TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_enabled
     FROM   feature_flags
     WHERE  tenant_id = p_tenant_id
       AND  flag_name = p_flag_name
     LIMIT 1),
    FALSE  -- se a flag não existir, assume desactivada
  )
$$;

COMMENT ON FUNCTION get_tenant_feature_flag(UUID, TEXT) IS
  'Verifica se uma feature flag está activa para um tenant. Retorna FALSE se a flag não existir.';
