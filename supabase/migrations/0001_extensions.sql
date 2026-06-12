-- =============================================================================
-- MIGRAÇÃO 0001: EXTENSÕES
-- Projeto: ExodoFlow AI
-- Descrição: Activa as extensões PostgreSQL necessárias para o projecto.
--            Deve ser a primeira migração a ser executada.
-- =============================================================================

-- Extensão para geração de UUIDs (nativa no PostgreSQL 13+, disponível no Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Extensão para vetores (embeddings de IA — usada na fase de IA real)
-- Necessária para o campo embedding em ai_contexts
CREATE EXTENSION IF NOT EXISTS "vector";

-- Extensão para manipulação avançada de texto (pesquisa full-text com acentos)
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Extensão para pesquisa full-text em português
-- Permite indexar e pesquisar texto em português com normalização de acentos
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
