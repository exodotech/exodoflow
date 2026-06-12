-- =============================================================================
-- MIGRAÇÃO 0020: SIMPLIFICAR BRANDING — REMOVER secondary_color
-- Projecto: ExodoFlow AI
-- Descrição: Decisão de produto — o branding passa a ter apenas logótipo + cor
--            principal. Remove a chave settings.branding.secondary_color de
--            todos os tenants que a tenham, sem quebrar o resto do JSONB.
--
-- Idempotente e não destrutivo: usa o operador #- para remover apenas o caminho
-- {branding,secondary_color}; tudo o resto de settings fica intacto.
-- =============================================================================

UPDATE tenants
SET settings = settings #- '{branding,secondary_color}'
WHERE settings -> 'branding' ? 'secondary_color';
