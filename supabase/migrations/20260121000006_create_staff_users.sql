-- Migration: Create staff_users table
-- Purpose: Internal staff identity with RBAC
-- Part of Phase 2: Customer Accounts + Staff Foundation

-- Create the staff_users table
CREATE TABLE IF NOT EXISTS staff_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_password_reset BOOLEAN NOT NULL DEFAULT true, -- Force password set on first login
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_staff_users_user_id ON staff_users(user_id);

-- Create index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_staff_users_email ON staff_users(email);

-- Create index on is_active for filtering
CREATE INDEX IF NOT EXISTS idx_staff_users_is_active ON staff_users(is_active) WHERE is_active = true;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_staff_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_staff_users_updated_at ON staff_users;
CREATE TRIGGER update_staff_users_updated_at
  BEFORE UPDATE ON staff_users
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_users_updated_at();

-- Enable Row Level Security
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;

-- Policy: Staff can read their own record
DROP POLICY IF EXISTS "Staff can read own record" ON staff_users;
CREATE POLICY "Staff can read own record" ON staff_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Staff can update their own record (limited fields)
DROP POLICY IF EXISTS "Staff can update own record" ON staff_users;
CREATE POLICY "Staff can update own record" ON staff_users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id 
    AND is_active = (SELECT is_active FROM staff_users WHERE user_id = auth.uid())
    AND requires_password_reset = (SELECT requires_password_reset FROM staff_users WHERE user_id = auth.uid())
  );

-- Policy: Service role has full access
DROP POLICY IF EXISTS "Service role full access staff_users" ON staff_users;
CREATE POLICY "Service role full access staff_users" ON staff_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT, UPDATE ON staff_users TO authenticated;
GRANT ALL ON staff_users TO service_role;

-- Add comments for documentation
COMMENT ON TABLE staff_users IS 'Internal staff identity with RBAC';
COMMENT ON COLUMN staff_users.user_id IS 'FK to auth.users.id (one-to-one)';
COMMENT ON COLUMN staff_users.full_name IS 'Staff member full name';
COMMENT ON COLUMN staff_users.email IS 'Staff member email (denormalized for easier querying)';
COMMENT ON COLUMN staff_users.is_active IS 'Whether staff account is active (soft delete)';
COMMENT ON COLUMN staff_users.requires_password_reset IS 'Force password set on first login';
COMMENT ON COLUMN staff_users.last_login_at IS 'Timestamp of last login';

-- Create trigger to log staff creation
CREATE OR REPLACE FUNCTION log_staff_creation()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_audit_log(
    'staff'::actor_type,
    NEW.user_id,
    NEW.email,
    'staff.created',
    'staff_user',
    NEW.id,
    jsonb_build_object(
      'full_name', NEW.full_name,
      'email', NEW.email,
      'is_active', NEW.is_active
    ),
    NULL,
    NULL
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_staff_creation_trigger ON staff_users;
CREATE TRIGGER log_staff_creation_trigger
  AFTER INSERT ON staff_users
  FOR EACH ROW
  EXECUTE FUNCTION log_staff_creation();

-- Create trigger to log staff updates
CREATE OR REPLACE FUNCTION log_staff_update()
RETURNS TRIGGER AS $$
DECLARE
  v_changes JSONB;
  v_actor_id UUID;
BEGIN
  -- Determine who made the change (current user or system)
  v_actor_id := auth.uid();
  
  -- Build a JSONB object of changed fields
  v_changes := jsonb_build_object(
    'old', jsonb_build_object(
      'full_name', OLD.full_name,
      'email', OLD.email,
      'is_active', OLD.is_active,
      'requires_password_reset', OLD.requires_password_reset
    ),
    'new', jsonb_build_object(
      'full_name', NEW.full_name,
      'email', NEW.email,
      'is_active', NEW.is_active,
      'requires_password_reset', NEW.requires_password_reset
    )
  );
  
  PERFORM create_audit_log(
    CASE WHEN v_actor_id IS NULL THEN 'system'::actor_type ELSE 'staff'::actor_type END,
    v_actor_id,
    NEW.email,
    'staff.updated',
    'staff_user',
    NEW.id,
    v_changes,
    NULL,
    NULL
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_staff_update_trigger ON staff_users;
CREATE TRIGGER log_staff_update_trigger
  AFTER UPDATE ON staff_users
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION log_staff_update();

-- Create function to check if user is staff
CREATE OR REPLACE FUNCTION is_staff_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM staff_users 
    WHERE user_id = p_user_id 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user has specific role
CREATE OR REPLACE FUNCTION has_role(p_user_id UUID, p_role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM staff_users su
    JOIN staff_role_assignments sra ON su.id = sra.staff_user_id
    JOIN roles r ON sra.role_id = r.id
    WHERE su.user_id = p_user_id 
    AND su.is_active = true
    AND r.name = p_role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user roles
CREATE OR REPLACE FUNCTION get_user_roles(p_user_id UUID)
RETURNS TABLE(role_name TEXT, role_description TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT r.name, r.description
  FROM staff_users su
  JOIN staff_role_assignments sra ON su.id = sra.staff_user_id
  JOIN roles r ON sra.role_id = r.id
  WHERE su.user_id = p_user_id 
  AND su.is_active = true
  ORDER BY r.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_staff_creation IS 'Logs staff creation to audit_logs';
COMMENT ON FUNCTION log_staff_update IS 'Logs staff updates to audit_logs';
COMMENT ON FUNCTION is_staff_user IS 'Check if user is an active staff member';
COMMENT ON FUNCTION has_role IS 'Check if user has a specific role';
COMMENT ON FUNCTION get_user_roles IS 'Get all roles for a user';
