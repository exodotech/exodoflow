-- =============================================================================
-- MIGRAÇÃO 0011: CRIAÇÃO DE TENANT NO SIGNUP
-- Projecto: ExodoFlow AI
-- Descrição: Garante que cada utilizador registado tem um tenant + profile.
--
-- ARQUITECTURA (dois caminhos, o segundo é o garantido):
--   1. Trigger on_auth_user_created em auth.users — criado APENAS se o role
--      da migration tiver permissão (nas versões recentes do Supabase,
--      auth.users pertence a supabase_auth_admin e o trigger pode falhar).
--   2. RPC ensure_tenant_for_current_user() — chamado pelo RegisterForm logo
--      após o signUp. Idempotente: se o tenant/profile já existem (trigger
--      correu), não faz nada. Este é o caminho que NÃO depende de permissões
--      especiais e funciona em qualquer ambiente.
-- =============================================================================


-- =============================================================================
-- FUNÇÃO INTERNA: provisiona tenant + profile para um utilizador
-- Reutilizada pelo trigger e pelo RPC
-- =============================================================================

CREATE OR REPLACE FUNCTION provision_tenant_for_user(
  p_user_id   UUID,
  p_email     TEXT,
  p_full_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER                    -- bypassa RLS para criar tenant + profile
SET search_path = public
AS $$
DECLARE
  new_tenant_id UUID;
  base_slug     TEXT;
  final_slug    TEXT;
  slug_counter  INT := 0;
  display_name  TEXT;
BEGIN
  -- Idempotência: se o profile já existe, devolve o tenant existente
  SELECT tenant_id INTO new_tenant_id FROM profiles WHERE id = p_user_id;
  IF new_tenant_id IS NOT NULL THEN
    RETURN new_tenant_id;
  END IF;

  display_name := COALESCE(NULLIF(p_full_name, ''), split_part(p_email, '@', 1));

  -- Gerar slug único a partir do prefixo do e-mail
  base_slug  := lower(regexp_replace(split_part(p_email, '@', 1), '[^a-z0-9]', '-', 'g'));
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM tenants WHERE slug = final_slug) LOOP
    slug_counter := slug_counter + 1;
    final_slug   := base_slug || '-' || slug_counter;
  END LOOP;

  -- Criar tenant vazio — o onboarding preenche name, slug, country, nicho
  INSERT INTO tenants (name, slug, business_type, country, onboarding_completed, onboarding_step)
  VALUES (display_name, final_slug, 'estetica', 'PT', FALSE, 0)
  RETURNING id INTO new_tenant_id;

  -- Criar profile como owner do tenant
  INSERT INTO profiles (id, tenant_id, role, full_name)
  VALUES (p_user_id, new_tenant_id, 'owner', display_name);

  -- Tentar injectar tenant_id no app_metadata (acelera o RLS via JWT).
  -- Se o role não tiver UPDATE em auth.users, não faz mal: auth_tenant_id()
  -- tem fallback ao profile (ver migração 0012).
  BEGIN
    UPDATE auth.users
    SET raw_app_meta_data =
      COALESCE(raw_app_meta_data, '{}'::jsonb) ||
      jsonb_build_object('tenant_id', new_tenant_id::text)
    WHERE id = p_user_id;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Sem permissão para actualizar auth.users — RLS usa fallback via profiles.';
  END;

  RETURN new_tenant_id;
END;
$$;

COMMENT ON FUNCTION provision_tenant_for_user IS
  'Cria tenant + profile (owner) para um utilizador novo. Idempotente.';


-- =============================================================================
-- RPC: ensure_tenant_for_current_user()
-- Chamado pelo cliente logo após o signUp. Caminho garantido de provisionamento.
-- =============================================================================

CREATE OR REPLACE FUNCTION ensure_tenant_for_current_user()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email   TEXT;
  v_name    TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida — utilizador não autenticado';
  END IF;

  SELECT email, raw_user_meta_data->>'full_name'
  INTO v_email, v_name
  FROM auth.users
  WHERE id = v_user_id;

  RETURN provision_tenant_for_user(v_user_id, v_email, v_name);
END;
$$;

COMMENT ON FUNCTION ensure_tenant_for_current_user IS
  'Garante tenant + profile para o utilizador autenticado. Chamado após signUp.';

GRANT EXECUTE ON FUNCTION ensure_tenant_for_current_user TO authenticated;


-- =============================================================================
-- FUNÇÃO DE TRIGGER + TRIGGER (opcional — só se houver permissão)
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Casos em que NÃO se provisiona um tenant novo:
  --   a) seed.sql / convites: tenant_id já presente no app_metadata;
  --   b) superadmin: is_superadmin no app_metadata;
  --   c) MEMBRO DE EQUIPA: join_tenant_id presente no user_metadata — o membro
  --      entra num tenant EXISTENTE e o Route Handler /api/equipa/criar-membro
  --      cria o profile com o role escolhido.
  --
  -- Nota de timing: app_metadata custom da admin API só é aplicado APÓS este
  -- trigger AFTER INSERT, por isso (c) usa user_metadata, que é gravado no
  -- próprio INSERT e está sempre disponível aqui. O signup público está
  -- desactivado, logo só a admin API (server-side) define estes marcadores.
  IF NEW.raw_app_meta_data ? 'tenant_id'
     OR COALESCE((NEW.raw_app_meta_data ->> 'is_superadmin')::boolean, FALSE)
     OR NEW.raw_user_meta_data ? 'join_tenant_id' THEN
    RETURN NEW;
  END IF;

  PERFORM provision_tenant_for_user(
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION handle_new_user() IS
  'Trigger de signup: provisiona tenant + profile. Complementado pelo RPC ensure_tenant_for_current_user.';

-- Criar o trigger apenas se o role tiver permissão sobre auth.users.
-- Se falhar, o RPC ensure_tenant_for_current_user cobre o fluxo de signup.
DO $$
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Sem permissão para criar trigger em auth.users — o provisionamento é garantido pelo RPC ensure_tenant_for_current_user().';
END;
$$;
