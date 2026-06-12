-- =============================================================================
-- MIGRAÇÃO 0019: GESTÃO DE EQUIPA — ÚLTIMO ACESSO + PROTECÇÃO DO ÚNICO OWNER
-- Projecto: ExodoFlow AI
-- Descrição:
--   1. profiles.last_login_at — regista o último acesso (mostrado na equipa).
--   2. Trigger protect_last_owner — impede suspender, despromover ou remover
--      o ÚNICO proprietário activo de um tenant (deixaria a empresa sem dono).
--
-- NOTA sobre "status": o estado do membro (active/suspended) é representado por
-- profiles.is_active — não se cria coluna redundante. O estado "pending" não se
-- aplica ao fluxo de criação directa de membros (o membro é activo de imediato).
-- =============================================================================

-- ── 1. Último acesso ─────────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.last_login_at IS
  'Momento do último início de sessão. Actualizado pelo cliente após login.';


-- ── 2. Protecção do único proprietário ───────────────────────────────────────
CREATE OR REPLACE FUNCTION protect_last_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_outros_owners INT;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Só interessa quando um OWNER deixa de ser owner activo (despromoção ou suspensão)
    IF OLD.role = 'owner'
       AND (NEW.role IS DISTINCT FROM 'owner' OR NEW.is_active = FALSE) THEN
      SELECT COUNT(*) INTO v_outros_owners
      FROM profiles
      WHERE tenant_id = OLD.tenant_id AND role = 'owner' AND is_active = TRUE AND id <> OLD.id;
      IF v_outros_owners = 0 THEN
        RAISE EXCEPTION 'Não pode suspender ou despromover o único proprietário da empresa.';
      END IF;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.role = 'owner' THEN
      SELECT COUNT(*) INTO v_outros_owners
      FROM profiles
      WHERE tenant_id = OLD.tenant_id AND role = 'owner' AND is_active = TRUE AND id <> OLD.id;
      IF v_outros_owners = 0 THEN
        RAISE EXCEPTION 'Não pode remover o único proprietário da empresa.';
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION protect_last_owner() IS
  'Impede que um tenant fique sem proprietário activo (suspender/despromover/remover o único owner).';

DROP TRIGGER IF EXISTS trigger_protect_last_owner ON profiles;
CREATE TRIGGER trigger_protect_last_owner
  BEFORE UPDATE OR DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_last_owner();

COMMENT ON TRIGGER trigger_protect_last_owner ON profiles IS
  'Garante que existe sempre pelo menos um proprietário activo por tenant.';
