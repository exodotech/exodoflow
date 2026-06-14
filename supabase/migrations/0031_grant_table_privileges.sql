-- =============================================================================
-- 0031 — GRANTs explícitos em todas as tabelas do schema public
--
-- Desde 2026-05-30 o Supabase local usa auto_expose_new_tables = false por
-- omissão, o que significa que tabelas criadas sem GRANT explícito ficam
-- inacessíveis aos roles authenticated / anon / service_role via PostgREST.
-- Esta migration restaura os privilégios necessários para o funcionamento da app.
--
-- Lógica de segurança:
--   - authenticated : SELECT/INSERT/UPDATE/DELETE controlados pelas políticas RLS
--   - anon          : SELECT em tabelas públicas (portal de reservas, templates)
--   - service_role  : ALL (já contorna RLS, mas precisa de grant ao nível da tabela)
-- =============================================================================

-- authenticated — acesso DML completo (RLS filtra as linhas)
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public
  TO authenticated;

-- service_role — acesso total (admin API, workers)
GRANT ALL PRIVILEGES
  ON ALL TABLES IN SCHEMA public
  TO service_role;

-- anon — somente leitura em tabelas que o portal público pode precisar
-- (RLS sem política para anon = sem linhas visíveis; seguro ser permissivo aqui)
GRANT SELECT ON services, resources, resource_availability, tenants, plans
  TO anon;

-- Garantir que futuros GRANTS se aplicam automaticamente (precaução extra)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
