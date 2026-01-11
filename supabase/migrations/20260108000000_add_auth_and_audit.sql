-- Migration: Add authentication roles and audit logging
-- This migration creates tables for user roles and audit logs

-- ============================================================================
-- User Roles Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'ops', 'marketing')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

COMMENT ON TABLE user_roles IS 'User role assignments for authorization';
COMMENT ON COLUMN user_roles.role IS 'Role type: admin (full access), ops (operations), marketing (campaigns only)';

-- ============================================================================
-- Audit Logs Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

COMMENT ON TABLE audit_logs IS 'Immutable audit log for all critical internal actions';
COMMENT ON COLUMN audit_logs.action IS 'Action performed (e.g., campaign.create, campaign.start, campaign.pause)';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity affected (e.g., campaign, recipient, follow_up)';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID of the affected entity';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context (changes, filters, etc.)';

-- ============================================================================
-- Row Level Security
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- User Roles: service_role only (admin management)
DROP POLICY IF EXISTS "Allow service role full access user_roles" ON user_roles;
CREATE POLICY "Allow service role full access user_roles" ON user_roles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Audit Logs: service_role can write, authenticated users can read their own
DROP POLICY IF EXISTS "Allow service role full access audit_logs" ON audit_logs;
CREATE POLICY "Allow service role full access audit_logs" ON audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow users to read their own audit logs" ON audit_logs;
CREATE POLICY "Allow users to read their own audit logs" ON audit_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- Permissions
-- ============================================================================
GRANT ALL ON user_roles TO service_role;
GRANT ALL ON audit_logs TO service_role;
GRANT SELECT ON audit_logs TO authenticated;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to check if a user has a specific role
CREATE OR REPLACE FUNCTION has_role(p_user_id UUID, p_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = p_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all roles for a user
CREATE OR REPLACE FUNCTION get_user_roles(p_user_id UUID)
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT role FROM user_roles
    WHERE user_id = p_user_id
    ORDER BY role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
  p_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_metadata,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION has_role(UUID, TEXT) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_user_roles(UUID) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION create_audit_log(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) TO service_role;

-- ============================================================================
-- Initial Setup Instructions
-- ============================================================================

-- To create the first admin user, run the following after migration:
-- 
-- 1. Create user in Supabase Dashboard (Authentication > Users > Add User)
--    OR use SQL:
--    
--    -- Note: Replace with actual email and get user_id from auth.users after creation
--    
-- 2. Assign admin role:
--    INSERT INTO user_roles (user_id, role)
--    VALUES ('USER_UUID_HERE', 'admin');
--
-- 3. User can now log in at /login with their credentials

COMMENT ON FUNCTION has_role IS 'Check if a user has a specific role';
COMMENT ON FUNCTION get_user_roles IS 'Get all roles assigned to a user';
COMMENT ON FUNCTION create_audit_log IS 'Create an immutable audit log entry';
