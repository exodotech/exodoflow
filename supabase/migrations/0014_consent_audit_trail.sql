-- =============================================================================
-- MIGRAÇÃO 0014: TRILHO DE AUDITORIA DE CONSENTIMENTO DE MARKETING (RGPD/LGPD)
-- Projecto: ExodoFlow AI
-- Descrição: A tabela legal_consents já existia (imutável) mas nunca era escrita.
--            Este trigger garante que cada escolha de marketing_consent — na
--            criação do cliente e em cada alteração posterior — gera um registo
--            imutável em legal_consents, atomicamente e sem poder ser contornado
--            por nenhum caminho de código (defesa em profundidade).
--
-- Modelo append-only: revogar = inserir nova linha com consented = FALSE.
-- A linha mais recente (consented_at) representa o estado actual.
--
-- NOTA sobre ip_address/user_agent: um trigger de BD não tem acesso ao contexto
-- do pedido HTTP. Para prova legal, o que é juridicamente crítico — a escolha,
-- a data/hora fidedigna (server-side) e a versão do texto — fica registado. A
-- captura de IP exigiria rotear a criação de clientes por um Route Handler
-- (melhoria futura documentada).
-- =============================================================================

-- Versão actual do texto de consentimento de marketing.
-- Incrementar quando o texto apresentado ao cliente mudar (manter sincronizado
-- com o frontend — ver src/lib/consent.ts).
-- Implementada como função para ser referenciada no trigger sem hardcode disperso.
CREATE OR REPLACE FUNCTION current_marketing_consent_version()
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$ SELECT 'marketing-v1'::TEXT $$;


CREATE OR REPLACE FUNCTION log_marketing_consent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER                 -- escreve em legal_consents independentemente do RLS do utilizador
SET search_path = public
AS $$
DECLARE
  v_consented BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Regista a escolha inicial (true OU false — prova que o cliente foi questionado)
    v_consented := COALESCE(NEW.marketing_consent, FALSE);

    INSERT INTO legal_consents (
      tenant_id, client_id, consent_type, consent_version, consented, consented_at
    )
    VALUES (
      NEW.tenant_id, NEW.id, 'marketing',
      current_marketing_consent_version(),
      v_consented, NOW()
    );
    RETURN NEW;
  END IF;

  -- UPDATE: registar apenas quando o valor muda de facto
  IF TG_OP = 'UPDATE'
     AND COALESCE(NEW.marketing_consent, FALSE) IS DISTINCT FROM COALESCE(OLD.marketing_consent, FALSE) THEN
    INSERT INTO legal_consents (
      tenant_id, client_id, consent_type, consent_version, consented, consented_at
    )
    VALUES (
      NEW.tenant_id, NEW.id, 'marketing',
      current_marketing_consent_version(),
      COALESCE(NEW.marketing_consent, FALSE), NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION log_marketing_consent() IS
  'Regista cada escolha de marketing_consent em legal_consents (append-only, imutável). RGPD/LGPD.';

-- AFTER INSERT: captura a escolha inicial.
-- AFTER UPDATE OF marketing_consent: só dispara quando a coluna está no SET.
DROP TRIGGER IF EXISTS trigger_log_marketing_consent ON clients;
CREATE TRIGGER trigger_log_marketing_consent
  AFTER INSERT OR UPDATE OF marketing_consent ON clients
  FOR EACH ROW
  EXECUTE FUNCTION log_marketing_consent();

COMMENT ON TRIGGER trigger_log_marketing_consent ON clients IS
  'Mantém o trilho de auditoria RGPD de consentimento de marketing em legal_consents.';
