-- Migration: Create audit_logs table
-- Purpose: Immutable audit trail for sensitive operations
-- Part of Phase 1: Minimal Safe Foundation

-- Create enum for actor types
DO $$ BEGIN
    CREATE TYPE actor_type AS ENUM ('staff', 'customer', 'system', 'anonymous');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_type actor_type NOT NULL,
  actor_id UUID, -- FK to auth.users.id for staff/customer, null for system/anonymous
  actor_email TEXT, -- Denormalized for easier querying
  action TEXT NOT NULL, -- e.g., 'preorder.created', 'preorder.edited', 'staff.created'
  resource_type TEXT NOT NULL, -- e.g., 'preorder', 'customer', 'staff_user', 'newsletter'
  resource_id UUID, -- ID of the affected resource
  metadata JSONB, -- Additional context (old values, new values, etc.)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for actor lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_type, actor_id);

-- Create index for action filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Create index for resource lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Create index for time-based queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Create GIN index for metadata JSONB queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata ON audit_logs USING GIN (metadata);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access (audit logs are append-only via API)
DROP POLICY IF EXISTS "Allow service role full access audit_logs" ON audit_logs;
CREATE POLICY "Allow service role full access audit_logs" ON audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Staff with super_admin or admin_ops can read audit logs (will be enforced in Phase 2)
-- This policy will be updated in Phase 2 when staff_users table exists

-- No anon/authenticated access - all operations go through API

-- Grant permissions
GRANT ALL ON audit_logs TO service_role;

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Immutable audit trail for sensitive operations';
COMMENT ON COLUMN audit_logs.actor_type IS 'Type of actor: staff, customer, system, or anonymous';
COMMENT ON COLUMN audit_logs.actor_id IS 'FK to auth.users.id for authenticated actors';
COMMENT ON COLUMN audit_logs.actor_email IS 'Denormalized email for easier querying';
COMMENT ON COLUMN audit_logs.action IS 'Action performed (e.g., preorder.created, staff.role_assigned)';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource affected (e.g., preorder, customer)';
COMMENT ON COLUMN audit_logs.resource_id IS 'ID of the affected resource';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context as JSONB (old/new values, etc.)';

-- Helper function to create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log(
  p_actor_type actor_type,
  p_actor_id UUID,
  p_actor_email TEXT,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_metadata JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    actor_type,
    actor_id,
    actor_email,
    action,
    resource_type,
    resource_id,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    p_actor_type,
    p_actor_id,
    p_actor_email,
    p_action,
    p_resource_type,
    p_resource_id,
    p_metadata,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_audit_log IS 'Helper function to create audit log entries';

-- Function to clean up old audit logs (optional, run yearly)
-- Keep audit logs for compliance, but can archive after 7 years
CREATE OR REPLACE FUNCTION archive_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  -- This is a placeholder for future archival logic
  -- In production, you might move to cold storage instead of deleting
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '7 years';
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION archive_old_audit_logs IS 'Archives audit logs older than 7 years';
