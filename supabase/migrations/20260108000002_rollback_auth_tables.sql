-- Rollback Migration: Reverse auth tables and seed admin users
-- This migration reverses:
--   - 20260108000001_seed_admin_users.sql
--   - 20260108000000_add_auth_tables.sql
--
-- WARNING: This will DELETE ALL user records in auth.users and all related data!
-- This is a destructive operation and cannot be undone.

-- ============================================================================
-- Step 1: Delete all user profiles (this will cascade from auth.users deletion)
-- ============================================================================

-- First, delete all records from user_profiles table
-- (These reference auth.users with ON DELETE CASCADE, but we delete explicitly for clarity)
DELETE FROM user_profiles;

-- ============================================================================
-- Step 2: Delete all audit log entries
-- ============================================================================

-- Delete all audit log records
DELETE FROM audit_log;

-- ============================================================================
-- Step 3: Delete all users from auth.users
-- ============================================================================

-- Delete all users from auth.users table
-- This will cascade to any tables that reference auth.users
DELETE FROM auth.users;

-- Also clean up related auth tables that may have orphaned records
DELETE FROM auth.identities WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM auth.sessions WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM auth.refresh_tokens WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM auth.mfa_factors WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM auth.mfa_challenges WHERE factor_id NOT IN (SELECT id FROM auth.mfa_factors);
DELETE FROM auth.mfa_amr_claims WHERE session_id NOT IN (SELECT id FROM auth.sessions);

-- ============================================================================
-- Step 4: Revoke permissions
-- ============================================================================

REVOKE EXECUTE ON FUNCTION is_admin(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION is_admin(UUID) FROM service_role;
REVOKE EXECUTE ON FUNCTION get_user_profile(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION get_user_profile(UUID) FROM service_role;

REVOKE ALL ON user_profiles FROM service_role;
REVOKE SELECT ON user_profiles FROM authenticated;

REVOKE ALL ON audit_log FROM service_role;
REVOKE SELECT, INSERT ON audit_log FROM authenticated;

-- ============================================================================
-- Step 5: Drop helper functions
-- ============================================================================

DROP FUNCTION IF EXISTS is_admin(UUID);
DROP FUNCTION IF EXISTS get_user_profile(UUID);

-- ============================================================================
-- Step 6: Drop RLS policies
-- ============================================================================

-- User profiles policies
DROP POLICY IF EXISTS "service_role_full_access_user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "users_read_own_profile" ON user_profiles;

-- Audit log policies
DROP POLICY IF EXISTS "service_role_full_access_audit_log" ON audit_log;
DROP POLICY IF EXISTS "admins_read_audit_log" ON audit_log;
DROP POLICY IF EXISTS "authenticated_insert_audit_log" ON audit_log;

-- ============================================================================
-- Step 7: Drop triggers and functions
-- ============================================================================

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
DROP FUNCTION IF EXISTS update_user_profiles_updated_at();

-- ============================================================================
-- Step 8: Drop indexes
-- ============================================================================

-- User profiles indexes
DROP INDEX IF EXISTS idx_user_profiles_email_unique;
DROP INDEX IF EXISTS idx_user_profiles_user_type;
DROP INDEX IF EXISTS idx_user_profiles_role;
DROP INDEX IF EXISTS idx_user_profiles_active;

-- Audit log indexes
DROP INDEX IF EXISTS idx_audit_log_user_id;
DROP INDEX IF EXISTS idx_audit_log_action;
DROP INDEX IF EXISTS idx_audit_log_entity;
DROP INDEX IF EXISTS idx_audit_log_created;

-- ============================================================================
-- Step 9: Drop tables
-- ============================================================================

DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS user_profiles;

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  -- Verify user_profiles table is dropped
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'user_profiles table still exists';
  END IF;
  
  -- Verify audit_log table is dropped
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'audit_log table still exists';
  END IF;
  
  -- Verify no users remain in auth.users
  IF EXISTS (SELECT 1 FROM auth.users LIMIT 1) THEN
    RAISE WARNING 'auth.users table still contains records - this may be expected if there are system users';
  END IF;
  
  RAISE NOTICE 'Rollback completed successfully';
END $$;
