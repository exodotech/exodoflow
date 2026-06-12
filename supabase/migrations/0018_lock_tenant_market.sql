-- =============================================================================
-- MIGRAÇÃO 0018: BLOQUEAR PAÍS E NICHO APÓS A CRIAÇÃO
-- Projecto: ExodoFlow AI
-- Descrição: Decisão de produto — country e business_type (nicho) definem
--            locale, moeda, fuso, labels, tax_id, comunicação e templates.
--            São escolhidos UMA VEZ (no onboarding) e, depois de
--            onboarding_completed = TRUE, ficam IMUTÁVEIS para o cliente.
--
-- Quem pode alterar depois:
--   - SUPERADMIN (role) — administração do sistema;
--   - operações de sistema sem JWT (service_role / Supabase Studio) — suporte.
--   - o OWNER/MANAGER NÃO pode (frontend bloqueado + este trigger).
--
-- Defesa em profundidade: o serviço salvarEmpresa já deixa de enviar estes
-- campos, mas este trigger garante a regra mesmo perante chamadas REST directas.
-- =============================================================================

CREATE OR REPLACE FUNCTION lock_tenant_market()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Só restringe DEPOIS do onboarding concluído
  IF OLD.onboarding_completed = TRUE
     -- Operações de sistema (service_role/Studio) não têm auth.uid() → permitidas (suporte)
     AND auth.uid() IS NOT NULL
     -- SUPERADMIN pode alterar (administração)
     AND auth_user_role() IS DISTINCT FROM 'superadmin'
     -- Há tentativa de mudar país ou nicho
     AND (NEW.country       IS DISTINCT FROM OLD.country
          OR NEW.business_type IS DISTINCT FROM OLD.business_type) THEN
    RAISE EXCEPTION 'País e nicho não podem ser alterados após a criação da empresa. Contacte o suporte.';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION lock_tenant_market() IS
  'Impede OWNER/MANAGER de alterar country/business_type após onboarding_completed. Permite SUPERADMIN e sistema.';

DROP TRIGGER IF EXISTS trigger_lock_tenant_market ON tenants;
CREATE TRIGGER trigger_lock_tenant_market
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION lock_tenant_market();

COMMENT ON TRIGGER trigger_lock_tenant_market ON tenants IS
  'País e nicho são imutáveis após a criação (excepto SUPERADMIN/sistema).';
