-- =============================================================================
-- MIGRAÇÃO 0022: VISITANTE NÃO GERA CONSENTIMENTO DE MARKETING NA CRIAÇÃO
-- Projecto: ExodoFlow AI
-- Descrição: O trigger log_marketing_consent regista a escolha inicial de
--            marketing_consent no INSERT (true OU false) como prova de que o
--            cliente foi questionado. Um VISITANTE (is_guest=TRUE) é um cadastro
--            rápido — NÃO foi questionado sobre marketing. Registar consented=FALSE
--            implicaria, erradamente, que recusou. RGPD/LGPD: não criar um registo
--            de consentimento que o cliente nunca deu nem recusou conscientemente.
--
--            Correcção: no INSERT, saltar o registo quando is_guest=TRUE. O trilho
--            passa a existir quando: (a) se cria um cliente permanente; ou (b) o
--            marketing_consent muda mais tarde (ex.: após converter o visitante) —
--            o ramo UPDATE do trigger continua a registar normalmente.
-- =============================================================================

CREATE OR REPLACE FUNCTION log_marketing_consent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consented BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Visitante: cadastro mínimo, não questionado sobre marketing — sem registo.
    IF COALESCE(NEW.is_guest, FALSE) = TRUE THEN
      RETURN NEW;
    END IF;

    -- Cliente permanente: regista a escolha inicial (true OU false).
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

  -- UPDATE: registar apenas quando o valor muda de facto (inclui o caso em que
  -- um visitante convertido aceita/recusa marketing pela primeira vez).
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
  'Regista cada escolha de marketing_consent em legal_consents (append-only, RGPD). Visitantes (is_guest) não geram registo na criação — não foram questionados.';
