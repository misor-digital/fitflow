-- Migration: Add authentication and audit tables
-- This migration creates tables for user authentication and audit logging

-- ============================================================================
-- User Profiles Table (unified for all users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  user_type TEXT NOT NULL CHECK (user_type IN ('admin', 'client')),
  role TEXT NOT NULL,
  -- Admin roles: 'admin', 'ops', 'marketing'
  -- Client roles: 'basic', 'premium' (future)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint on email (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_email_unique 
  ON user_profiles(LOWER(email));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_type ON user_profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- ============================================================================
-- Audit Log Table (immutable, append-only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  -- Actions: 'campaign.create', 'campaign.update', 'campaign.start', 
  -- 'campaign.pause', 'campaign.resume', 'campaign.cancel', 'follow_up.create'
  entity_type TEXT NOT NULL,
  -- Entity types: 'campaign', 'follow_up', 'recipient'
  entity_id UUID,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- ============================================================================
-- Row Level Security
-- ============================================================================

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- User profiles: service_role full access
DROP POLICY IF EXISTS "service_role_full_access_user_profiles" ON user_profiles;
CREATE POLICY "service_role_full_access_user_profiles" ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- User profiles: authenticated users can read their own profile
DROP POLICY IF EXISTS "users_read_own_profile" ON user_profiles;
CREATE POLICY "users_read_own_profile" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Audit log: service_role full access
DROP POLICY IF EXISTS "service_role_full_access_audit_log" ON audit_log;
CREATE POLICY "service_role_full_access_audit_log" ON audit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Audit log: authenticated admins can read (no update/delete)
DROP POLICY IF EXISTS "admins_read_audit_log" ON audit_log;
CREATE POLICY "admins_read_audit_log" ON audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.user_type = 'admin'
      AND user_profiles.is_active = true
    )
  );

-- Audit log: authenticated users can insert (for logging their own actions)
DROP POLICY IF EXISTS "authenticated_insert_audit_log" ON audit_log;
CREATE POLICY "authenticated_insert_audit_log" ON audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- Permissions
-- ============================================================================
GRANT ALL ON user_profiles TO service_role;
GRANT SELECT ON user_profiles TO authenticated;

GRANT ALL ON audit_log TO service_role;
GRANT SELECT, INSERT ON audit_log TO authenticated;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = p_user_id 
    AND user_type = 'admin'
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user profile
CREATE OR REPLACE FUNCTION get_user_profile(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  user_type TEXT,
  role TEXT,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    up.email,
    up.name,
    up.user_type,
    up.role,
    up.is_active
  FROM user_profiles up
  WHERE up.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile(UUID) TO service_role;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE user_profiles IS 'User profiles for authentication - unified for admin and client users';
COMMENT ON TABLE audit_log IS 'Immutable audit log for tracking admin actions';

COMMENT ON COLUMN user_profiles.user_type IS 'Type of user: admin or client';
COMMENT ON COLUMN user_profiles.role IS 'Role within user type (admin: admin/ops/marketing, client: basic/premium)';
COMMENT ON COLUMN user_profiles.is_active IS 'Whether the user account is active';

COMMENT ON COLUMN audit_log.action IS 'Action performed (e.g., campaign.create, campaign.pause)';
COMMENT ON COLUMN audit_log.entity_type IS 'Type of entity affected (e.g., campaign, follow_up)';
COMMENT ON COLUMN audit_log.entity_id IS 'ID of the affected entity';
COMMENT ON COLUMN audit_log.metadata IS 'Additional context about the action';
