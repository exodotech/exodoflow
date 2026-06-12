-- =============================================================================
-- MIGRAÇÃO 0010: STORAGE — BUCKET DE LOGOS DE TENANT
-- Projecto: ExodoFlow AI
-- Descrição: Cria o bucket 'tenant-logos' no Supabase Storage com políticas RLS
--            que garantem que cada tenant só pode gerir o próprio logo.
--
-- Regras de segurança:
--   - Bucket público (URLs acessíveis sem autenticação — para exibição no frontend)
--   - INSERT/UPDATE/DELETE apenas pelo tenant que é dono da pasta
--   - Tamanho máximo: 2MB por ficheiro
--   - Tipos permitidos: PNG, JPEG, WebP, SVG
--   - Estrutura de path: {tenant_id}/logo.{ext}
-- =============================================================================


-- =============================================================================
-- PASSO 1: Criar bucket tenant-logos
-- =============================================================================

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'tenant-logos',
  'tenant-logos',
  TRUE,
  2097152,  -- 2 MB em bytes
  -- SVG deliberadamente excluído: pode conter <script> embebido (XSS armazenado)
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET
    file_size_limit    = 2097152,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];


-- =============================================================================
-- PASSO 2: Políticas RLS sobre storage.objects para tenant-logos
-- =============================================================================

-- NOTA 1: PostgreSQL não suporta CREATE POLICY IF NOT EXISTS.
--   Padrão correcto para idempotência: DROP POLICY IF EXISTS + CREATE POLICY.
-- NOTA 2: nas versões recentes do Supabase, storage.objects pertence ao role
--   supabase_storage_admin — a migration (que corre como postgres) pode não
--   ter permissão para criar policies. O bloco abaixo tenta criar e, se não
--   tiver privilégio, regista um aviso: nesse caso as policies devem ser
--   criadas no Dashboard (Storage → Policies) com as mesmas regras.
DO $$
BEGIN
  -- SELECT público: qualquer pessoa pode ver logos (para exibição nos clientes)
  DROP POLICY IF EXISTS "tenant_logos_select_public" ON storage.objects;
  CREATE POLICY "tenant_logos_select_public"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'tenant-logos');

  -- INSERT: apenas o próprio tenant pode enviar (path começa com tenant_id)
  DROP POLICY IF EXISTS "tenant_logos_insert_own" ON storage.objects;
  CREATE POLICY "tenant_logos_insert_own"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'tenant-logos'
      AND (storage.foldername(name))[1] = auth_tenant_id()::text
    );

  -- UPDATE: apenas o próprio tenant pode substituir
  DROP POLICY IF EXISTS "tenant_logos_update_own" ON storage.objects;
  CREATE POLICY "tenant_logos_update_own"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
      bucket_id = 'tenant-logos'
      AND (storage.foldername(name))[1] = auth_tenant_id()::text
    )
    WITH CHECK (
      bucket_id = 'tenant-logos'
      AND (storage.foldername(name))[1] = auth_tenant_id()::text
    );

  -- DELETE: apenas o próprio tenant pode apagar
  DROP POLICY IF EXISTS "tenant_logos_delete_own" ON storage.objects;
  CREATE POLICY "tenant_logos_delete_own"
    ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'tenant-logos'
      AND (storage.foldername(name))[1] = auth_tenant_id()::text
    );
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Sem permissão para criar policies em storage.objects — criar manualmente no Dashboard (Storage → Policies) para o bucket tenant-logos.';
END;
$$;
