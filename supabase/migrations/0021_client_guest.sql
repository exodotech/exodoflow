-- =============================================================================
-- MIGRAÇÃO 0021: CLIENTE VISITANTE (cliente rápido)
-- Projecto: ExodoFlow AI
-- Descrição: Nem todo o cliente precisa de cadastro completo. Um "visitante" é
--            criado com o mínimo (nome + telefone opcional), sem exigir e-mail,
--            NIF/CPF, morada ou consentimento de marketing. Pode mais tarde ser
--            convertido em cliente permanente.
--
-- Não-destrutivo: apenas acrescenta colunas com default seguro. Clientes
-- existentes ficam is_guest=FALSE (permanentes), sem alteração de comportamento.
-- RLS/soft-delete/consentimentos continuam a aplicar-se igualmente a visitantes.
-- =============================================================================

-- Marca um cliente como visitante (cadastro mínimo). Default FALSE = permanente.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_guest BOOLEAN NOT NULL DEFAULT FALSE;

-- Momento em que um visitante foi convertido em cliente permanente (NULL = nunca).
ALTER TABLE clients ADD COLUMN IF NOT EXISTS guest_converted_at TIMESTAMPTZ;

COMMENT ON COLUMN clients.is_guest IS
  'TRUE = cliente visitante (cadastro mínimo: nome + telefone). FALSE = cliente permanente.';
COMMENT ON COLUMN clients.guest_converted_at IS
  'Momento da conversão visitante → permanente. NULL enquanto for visitante ou se nasceu permanente.';

-- Índice parcial para listar/filtrar visitantes activos rapidamente.
CREATE INDEX IF NOT EXISTS idx_clients_guest
  ON clients (tenant_id)
  WHERE is_guest = TRUE AND deleted_at IS NULL;
