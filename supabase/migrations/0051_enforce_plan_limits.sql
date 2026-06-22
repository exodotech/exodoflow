-- =============================================================================
-- MIGRAÇÃO 0051: IMPOR LIMITES DO PLANO (recursos e clientes)
-- Projecto: ExodoFlow AI
-- Descrição: Cada plano define max_resources e max_clients (NULL = ilimitado).
--            Até agora os limites estavam definidos mas NÃO eram impostos — um
--            tenant podia criar recursos/clientes sem limite. Este trigger trava
--            a criação acima do limite do plano.
--
-- Quem é travado:
--   - OWNER/MANAGER/RECEPTIONIST a criar pela app (têm auth.uid()).
-- Quem passa (sem limite):
--   - operações de sistema sem JWT (seed, service_role / Studio) — auth.uid() NULL.
--     Isto garante que o seed e a criação de empresas pelo superadmin não partem.
--
-- Contagem: apenas registos ATIVOS (deleted_at IS NULL) — apagar liberta espaço.
-- =============================================================================

CREATE OR REPLACE FUNCTION enforce_plan_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_max   INTEGER;
  v_count INTEGER;
BEGIN
  -- Operações de sistema (sem JWT) não são limitadas — seed/superadmin/suporte.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'resources' THEN
    SELECT p.max_resources INTO v_max
      FROM tenants t JOIN plans p ON p.id = t.plan_id
     WHERE t.id = NEW.tenant_id;
    IF v_max IS NOT NULL THEN
      SELECT count(*) INTO v_count
        FROM resources
       WHERE tenant_id = NEW.tenant_id AND deleted_at IS NULL;
      IF v_count >= v_max THEN
        RAISE EXCEPTION 'Limite do plano atingido: máximo de % recursos. Faça upgrade do plano para adicionar mais.', v_max
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;

  ELSIF TG_TABLE_NAME = 'clients' THEN
    SELECT p.max_clients INTO v_max
      FROM tenants t JOIN plans p ON p.id = t.plan_id
     WHERE t.id = NEW.tenant_id;
    IF v_max IS NOT NULL THEN
      SELECT count(*) INTO v_count
        FROM clients
       WHERE tenant_id = NEW.tenant_id AND deleted_at IS NULL;
      IF v_count >= v_max THEN
        RAISE EXCEPTION 'Limite do plano atingido: máximo de % clientes. Faça upgrade do plano para adicionar mais.', v_max
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION enforce_plan_limit() IS
  'Impede criar recursos/clientes acima do limite do plano (max_resources/max_clients). Sistema sem JWT passa.';

DROP TRIGGER IF EXISTS trg_enforce_resource_limit ON resources;
CREATE TRIGGER trg_enforce_resource_limit
  BEFORE INSERT ON resources
  FOR EACH ROW
  EXECUTE FUNCTION enforce_plan_limit();

DROP TRIGGER IF EXISTS trg_enforce_client_limit ON clients;
CREATE TRIGGER trg_enforce_client_limit
  BEFORE INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION enforce_plan_limit();
