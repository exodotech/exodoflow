-- =============================================================================
-- 0043 — RATE LIMIT DISTRIBUÍDO
--
-- Store partilhado para rate limiting que funciona ENTRE instâncias serverless
-- (o limitador in-memory só protege um processo). Usado nas rotas públicas mais
-- abusáveis (ex.: criar marcação no portal). UPSERT atómico por chave.
-- =============================================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT        PRIMARY KEY,
  count        INT         NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE rate_limits IS 'Contadores de rate limit partilhados entre instâncias. Acesso só via RPC rl_hit.';

-- RLS: nenhum acesso direto do cliente (sem políticas = deny-all). Só a RPC
-- SECURITY DEFINER (e o service_role, que ignora RLS) lê/escreve.
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- ── RPC atómica: regista 1 "hit" e devolve se é permitido ────────────────────
-- Janela deslizante simples: se a janela expirou, reinicia a 1; senão incrementa.
CREATE OR REPLACE FUNCTION rl_hit(p_key TEXT, p_limit INT, p_window_seconds INT)
RETURNS TABLE (allowed BOOLEAN, remaining INT, reset_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
  v_start TIMESTAMPTZ;
BEGIN
  INSERT INTO rate_limits (key, count, window_start)
  VALUES (p_key, 1, NOW())
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      WHEN rate_limits.window_start < NOW() - make_interval(secs => p_window_seconds)
      THEN 1 ELSE rate_limits.count + 1 END,
    window_start = CASE
      WHEN rate_limits.window_start < NOW() - make_interval(secs => p_window_seconds)
      THEN NOW() ELSE rate_limits.window_start END
  RETURNING rate_limits.count, rate_limits.window_start INTO v_count, v_start;

  RETURN QUERY SELECT
    (v_count <= p_limit),
    GREATEST(0, p_limit - v_count),
    v_start + make_interval(secs => p_window_seconds);
END;
$$;

COMMENT ON FUNCTION rl_hit(TEXT, INT, INT) IS 'Rate limit atómico partilhado. Devolve allowed/remaining/reset_at.';

-- Limpeza de chaves antigas (chamável por um cron; mantém a tabela pequena).
CREATE OR REPLACE FUNCTION rl_cleanup(p_older_than_seconds INT DEFAULT 3600)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_n INT;
BEGIN
  DELETE FROM rate_limits WHERE window_start < NOW() - make_interval(secs => p_older_than_seconds);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;
