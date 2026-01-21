-- Migration: Create staff_role_assignments table
-- Purpose: Many-to-many relationship between staff users and roles
-- Part of Phase 2: Customer Accounts + Staff Foundation

-- Create the staff_role_assignments table
CREATE TABLE IF NOT EXISTS staff_role_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(staff_user_id, role_id) -- Prevent duplicate role assignments
);

-- Create index on staff_user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_staff_role_assignments_staff_user_id ON staff_role_assignments(staff_user_id);

-- Create index on role_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_staff_role_assignments_role_id ON staff_role_assignments(role_id);

-- Create index on assigned_by for audit trail
CREATE INDEX IF NOT EXISTS idx_staff_role_assignments_assigned_by ON staff_role_assignments(assigned_by);

-- Enable Row Level Security
ALTER TABLE staff_role_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Staff can read their own role assignments
DROP POLICY IF EXISTS "Staff can read own role assignments" ON staff_role_assignments;
CREATE POLICY "Staff can read own role assignments" ON staff_role_assignments
  FOR SELECT
  TO authenticated
  USING (
    staff_user_id IN (
      SELECT id FROM staff_users WHERE user_id = auth.uid()
    )
  );

-- Policy: Service role has full access
DROP POLICY IF EXISTS "Service role full access staff_role_assignments" ON staff_role_assignments;
CREATE POLICY "Service role full access staff_role_assignments" ON staff_role_assignments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON staff_role_assignments TO authenticated;
GRANT ALL ON staff_role_assignments TO service_role;

-- Add comments for documentation
COMMENT ON TABLE staff_role_assignments IS 'Many-to-many relationship between staff users and roles';
COMMENT ON COLUMN staff_role_assignments.staff_user_id IS 'FK to staff_users.id';
COMMENT ON COLUMN staff_role_assignments.role_id IS 'FK to roles.id';
COMMENT ON COLUMN staff_role_assignments.assigned_by IS 'FK to staff_users.id (who assigned this role)';
COMMENT ON COLUMN staff_role_assignments.assigned_at IS 'When the role was assigned';

-- Create trigger to log role assignments
CREATE OR REPLACE FUNCTION log_role_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_staff_email TEXT;
  v_role_name TEXT;
  v_assigner_email TEXT;
BEGIN
  -- Get staff email
  SELECT email INTO v_staff_email FROM staff_users WHERE id = NEW.staff_user_id;
  
  -- Get role name
  SELECT name INTO v_role_name FROM roles WHERE id = NEW.role_id;
  
  -- Get assigner email (if exists)
  IF NEW.assigned_by IS NOT NULL THEN
    SELECT email INTO v_assigner_email FROM staff_users WHERE id = NEW.assigned_by;
  END IF;
  
  PERFORM create_audit_log(
    'staff'::actor_type,
    (SELECT user_id FROM staff_users WHERE id = NEW.assigned_by),
    v_assigner_email,
    'staff.role_assigned',
    'staff_role_assignment',
    NEW.id,
    jsonb_build_object(
      'staff_email', v_staff_email,
      'role_name', v_role_name,
      'assigned_by', v_assigner_email
    ),
    NULL,
    NULL
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_role_assignment_trigger ON staff_role_assignments;
CREATE TRIGGER log_role_assignment_trigger
  AFTER INSERT ON staff_role_assignments
  FOR EACH ROW
  EXECUTE FUNCTION log_role_assignment();

-- Create trigger to log role removals
CREATE OR REPLACE FUNCTION log_role_removal()
RETURNS TRIGGER AS $$
DECLARE
  v_staff_email TEXT;
  v_role_name TEXT;
  v_actor_id UUID;
BEGIN
  -- Get staff email
  SELECT email INTO v_staff_email FROM staff_users WHERE id = OLD.staff_user_id;
  
  -- Get role name
  SELECT name INTO v_role_name FROM roles WHERE id = OLD.role_id;
  
  -- Get current user (who removed the role)
  v_actor_id := auth.uid();
  
  PERFORM create_audit_log(
    CASE WHEN v_actor_id IS NULL THEN 'system'::actor_type ELSE 'staff'::actor_type END,
    v_actor_id,
    (SELECT email FROM staff_users WHERE user_id = v_actor_id),
    'staff.role_removed',
    'staff_role_assignment',
    OLD.id,
    jsonb_build_object(
      'staff_email', v_staff_email,
      'role_name', v_role_name
    ),
    NULL,
    NULL
  );
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_role_removal_trigger ON staff_role_assignments;
CREATE TRIGGER log_role_removal_trigger
  BEFORE DELETE ON staff_role_assignments
  FOR EACH ROW
  EXECUTE FUNCTION log_role_removal();

-- Create function to assign role to staff user
CREATE OR REPLACE FUNCTION assign_role_to_staff(
  p_staff_user_id UUID,
  p_role_id UUID,
  p_assigned_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_assignment_id UUID;
BEGIN
  INSERT INTO staff_role_assignments (staff_user_id, role_id, assigned_by)
  VALUES (p_staff_user_id, p_role_id, p_assigned_by)
  ON CONFLICT (staff_user_id, role_id) DO NOTHING
  RETURNING id INTO v_assignment_id;
  
  RETURN v_assignment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to remove role from staff user
CREATE OR REPLACE FUNCTION remove_role_from_staff(
  p_staff_user_id UUID,
  p_role_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_deleted BOOLEAN;
BEGIN
  DELETE FROM staff_role_assignments
  WHERE staff_user_id = p_staff_user_id
  AND role_id = p_role_id;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if staff has any of the specified roles
CREATE OR REPLACE FUNCTION has_any_role(p_user_id UUID, p_role_names TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM staff_users su
    JOIN staff_role_assignments sra ON su.id = sra.staff_user_id
    JOIN roles r ON sra.role_id = r.id
    WHERE su.user_id = p_user_id 
    AND su.is_active = true
    AND r.name = ANY(p_role_names)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_role_assignment IS 'Logs role assignments to audit_logs';
COMMENT ON FUNCTION log_role_removal IS 'Logs role removals to audit_logs';
COMMENT ON FUNCTION assign_role_to_staff IS 'Assign a role to a staff user';
COMMENT ON FUNCTION remove_role_from_staff IS 'Remove a role from a staff user';
COMMENT ON FUNCTION has_any_role IS 'Check if user has any of the specified roles';
