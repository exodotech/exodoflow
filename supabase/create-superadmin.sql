-- =============================================================================
-- ExodoFlow Pro — Criar Superadmin em Produção / Staging
--
-- SUBSTITUIR antes de executar:
--   YOUR_SUPERADMIN_EMAIL    → o teu email real (ex: jose@exodotech.com)
--   YOUR_STRONG_PASSWORD     → password forte (mín. 12 chars, maiúsculas+números+símbolo)
--   YOUR_FULL_NAME           → nome completo (ex: José Paulo)
--
-- Executar no SQL Editor do Supabase Cloud (com privilégios de service_role).
-- NUNCA partilhar este ficheiro com a password preenchida.
-- =============================================================================

DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_email   text := 'YOUR_SUPERADMIN_EMAIL';
  v_name    text := 'YOUR_FULL_NAME';
BEGIN
  -- 1. Criar utilizador em auth.users
  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new,
    recovery_token, email_change_token_current,
    phone, phone_confirmed_at, phone_change, phone_change_token,
    reauthentication_token, is_super_admin
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_email,
    -- SUBSTITUIR 'YOUR_STRONG_PASSWORD' pela password desejada:
    crypt('YOUR_STRONG_PASSWORD', gen_salt('bf')),
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', '["email"]'::jsonb, 'is_superadmin', true),
    jsonb_build_object('full_name', v_name),
    NOW(), NOW(),
    '', '', '', '', '', '', NULL, '', '', '', false
  );

  -- 2. Criar sessão de identidade (necessário para login)
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    v_email,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    NOW(), NOW(), NOW()
  );

  -- 3. Criar perfil (sem tenant_id — superadmin não pertence a nenhum tenant)
  INSERT INTO profiles (id, tenant_id, role, full_name)
  VALUES (v_user_id, NULL, 'superadmin', v_name)
  ON CONFLICT (id) DO UPDATE
    SET role = 'superadmin', tenant_id = NULL;

  RAISE NOTICE 'Superadmin criado: % (id: %)', v_email, v_user_id;
END $$;

-- Verificar
SELECT u.email, p.role, p.tenant_id
FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE p.role = 'superadmin';
