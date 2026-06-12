-- =============================================================================
-- MIGRAÇÃO 0015: GUARDA CONTRA ESCALADA DE PRIVILÉGIOS NO PRÓPRIO PERFIL
-- Projecto: ExodoFlow AI
-- Descrição: A policy profiles_update_own permite ao utilizador actualizar o
--            SEU próprio perfil — mas o RLS do PostgreSQL não restringe colunas.
--            Isto permitia a um manager/staff fazer
--              UPDATE profiles SET role='owner' WHERE id = auth.uid()
--            e escalar a própria função (vulnerabilidade real, confirmada).
--
--            Este trigger BEFORE UPDATE impede que um utilizador altere a sua
--            PRÓPRIA função, tenant ou estado de actividade. Continua a permitir:
--              - editar os próprios dados (nome, telefone, avatar);
--              - owner/manager gerirem OUTROS membros (auth.uid() <> id);
--              - operações server-side com service_role (auth.uid() IS NULL).
-- =============================================================================

CREATE OR REPLACE FUNCTION prevent_profile_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER                  -- auth.uid() reflecte o utilizador do pedido
SET search_path = public
AS $$
BEGIN
  -- Sem JWT (service_role / sistema): não restringe — operações administrativas
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Auto-actualização: bloquear alteração de campos sensíveis pelo próprio
  IF auth.uid() = NEW.id THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Não pode alterar a sua própria função';
    END IF;
    IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
      RAISE EXCEPTION 'Não pode alterar o seu próprio tenant';
    END IF;
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      RAISE EXCEPTION 'Não pode alterar o seu próprio estado de actividade';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION prevent_profile_self_escalation() IS
  'Impede escalada de privilégios: o utilizador não pode mudar a própria role/tenant/is_active.';

DROP TRIGGER IF EXISTS trigger_prevent_profile_self_escalation ON profiles;
CREATE TRIGGER trigger_prevent_profile_self_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_profile_self_escalation();

COMMENT ON TRIGGER trigger_prevent_profile_self_escalation ON profiles IS
  'Defesa em profundidade sobre profiles_update_own (que não restringe colunas).';


-- =============================================================================
-- POLICY: owner/manager vêem TODOS os profiles do tenant (activos E inactivos)
-- A policy profiles_select_same_tenant filtra is_active = TRUE (mostra colegas
-- activos). Para a GESTÃO DE EQUIPA, o owner/manager precisa de ver também os
-- membros desactivados — senão desapareciam da lista e não podiam ser reactivados.
-- =============================================================================

DROP POLICY IF EXISTS "profiles_select_manager_all" ON profiles;
CREATE POLICY "profiles_select_manager_all"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'manager')
  );

COMMENT ON POLICY "profiles_select_manager_all" ON profiles IS
  'Owner/manager vêem todos os membros do tenant (incl. inactivos) para gestão de equipa.';
