-- =============================================================================
-- 0033 — MARCAÇÃO RÁPIDA (cliente não identificado / balcão)
--
-- Modelo de 3 tipos de "cliente" numa marcação:
--   1. Cliente   — cadastro completo
--   2. Visitante — is_guest=true (nome obrig., telefone opcional) — JÁ existia
--   3. Marcação Rápida — SEM dados pessoais, atendimento imediato (NOVO)
--
-- bookings.client_id é NOT NULL → Opção B: cliente técnico anónimo reutilizável
-- por tenant (is_quick=true). Um por tenant, criado preguiçosamente. Não polui a
-- lista de clientes, não recolhe dados pessoais e não gera consentimento (o
-- trigger log_marketing_consent já salta is_guest=true).
-- =============================================================================

-- ── 1. Coluna marcadora ──────────────────────────────────────────────────────
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_quick BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN clients.is_quick IS
  'Cliente técnico de "Marcação Rápida" (não identificado). Escondido da lista de clientes; nunca recolhe dados pessoais.';

-- Índice parcial: acelera a procura do cliente rápido do tenant (1 por tenant).
CREATE INDEX IF NOT EXISTS idx_clients_quick
  ON clients (tenant_id) WHERE is_quick = true AND deleted_at IS NULL;


-- ── 2. RPC idempotente: obter/criar o cliente rápido do tenant ───────────────
-- SECURITY DEFINER: o tenant vem do JWT (auth_tenant_id), o INSERT corre como
-- definer (contorna RLS de forma controlada). Devolve sempre 1 cliente rápido
-- por tenant — reutilizado por todas as marcações rápidas.
CREATE OR REPLACE FUNCTION get_or_create_quick_client()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_tenant UUID := auth_tenant_id();
  v_id     UUID;
BEGIN
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Sem tenant na sessão';
  END IF;

  SELECT id INTO v_id
  FROM clients
  WHERE tenant_id = v_tenant AND is_quick = true AND deleted_at IS NULL
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO clients (tenant_id, full_name, is_guest, is_quick, marketing_consent)
    VALUES (v_tenant, 'Marcação Rápida', true, true, false)
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION get_or_create_quick_client() IS
  'Devolve (criando se preciso) o cliente técnico de Marcação Rápida do tenant. Sem dados pessoais nem consentimento.';

GRANT EXECUTE ON FUNCTION get_or_create_quick_client() TO authenticated;


-- ── 3. Documentação do flag de tenant ────────────────────────────────────────
-- settings.booking.allow_quick_booking (boolean, default TRUE) controla se a
-- opção "Marcação Rápida" aparece. Vive no JSONB settings — sem coluna nova.
COMMENT ON COLUMN tenants.settings IS
  'JSONB de configurações. Inclui booking.allow_quick_booking (bool, default true) — permitir marcações rápidas sem cliente identificado.';
