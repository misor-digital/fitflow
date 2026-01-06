-- Migration: Seed initial admin users
-- 
-- This migration creates the initial admin users in auth.users and user_profiles.
-- Users will need to use "Forgot Password" to set their passwords.
--
-- IMPORTANT: This uses Supabase's auth.users table directly.
-- The users are created with a placeholder encrypted password - they MUST
-- use the password reset flow to set their actual passwords.

-- ============================================================================
-- Create admin users in auth.users
-- ============================================================================

-- Note: We use gen_random_uuid() for user IDs and a placeholder password hash.
-- Users will need to reset their passwords via email.

DO $$
DECLARE
  v_user_id_1 UUID;
  v_user_id_2 UUID;
BEGIN
  -- Check if development@fitflow.bg already exists
  SELECT id INTO v_user_id_1 FROM auth.users WHERE email = 'development@fitflow.bg';
  
  IF v_user_id_1 IS NULL THEN
    v_user_id_1 := gen_random_uuid();
    
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      confirmation_token,
      recovery_token
    ) VALUES (
      v_user_id_1,
      '00000000-0000-0000-0000-000000000000',
      'development@fitflow.bg',
      -- Placeholder password - user MUST reset via email
      crypt('PLACEHOLDER_MUST_RESET_' || gen_random_uuid()::text, gen_salt('bf')),
      NOW(), -- Email confirmed
      NOW(),
      NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Development Admin"}',
      false,
      'authenticated',
      'authenticated',
      encode(gen_random_bytes(32), 'hex'),
      encode(gen_random_bytes(32), 'hex')
    );
    
    -- Create user profile
    INSERT INTO user_profiles (id, email, name, user_type, role, is_active)
    VALUES (v_user_id_1, 'development@fitflow.bg', 'Development Admin', 'admin', 'admin', true);
    
    RAISE NOTICE 'Created admin user: development@fitflow.bg';
  ELSE
    -- Ensure profile exists
    INSERT INTO user_profiles (id, email, name, user_type, role, is_active)
    VALUES (v_user_id_1, 'development@fitflow.bg', 'Development Admin', 'admin', 'admin', true)
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Admin user already exists: development@fitflow.bg';
  END IF;

  -- Check if admin@fitflow.bg already exists
  SELECT id INTO v_user_id_2 FROM auth.users WHERE email = 'admin@fitflow.bg';
  
  IF v_user_id_2 IS NULL THEN
    v_user_id_2 := gen_random_uuid();
    
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      confirmation_token,
      recovery_token
    ) VALUES (
      v_user_id_2,
      '00000000-0000-0000-0000-000000000000',
      'admin@fitflow.bg',
      -- Placeholder password - user MUST reset via email
      crypt('PLACEHOLDER_MUST_RESET_' || gen_random_uuid()::text, gen_salt('bf')),
      NOW(), -- Email confirmed
      NOW(),
      NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Admin"}',
      false,
      'authenticated',
      'authenticated',
      encode(gen_random_bytes(32), 'hex'),
      encode(gen_random_bytes(32), 'hex')
    );
    
    -- Create user profile
    INSERT INTO user_profiles (id, email, name, user_type, role, is_active)
    VALUES (v_user_id_2, 'admin@fitflow.bg', 'Admin', 'admin', 'admin', true);
    
    RAISE NOTICE 'Created admin user: admin@fitflow.bg';
  ELSE
    -- Ensure profile exists
    INSERT INTO user_profiles (id, email, name, user_type, role, is_active)
    VALUES (v_user_id_2, 'admin@fitflow.bg', 'Admin', 'admin', 'admin', true)
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Admin user already exists: admin@fitflow.bg';
  END IF;
END $$;

-- ============================================================================
-- Post-migration instructions
-- ============================================================================
-- 
-- After running this migration, admin users need to set their passwords:
-- 
-- 1. Go to the login page at /login
-- 2. Click "Forgot Password" (you'll need to add this link)
-- 3. Or use Supabase Dashboard > Authentication > Users > Send password reset
-- 4. Check email and set password
--
-- Alternatively, use the Supabase CLI or Dashboard to manually set passwords.
-- ============================================================================
