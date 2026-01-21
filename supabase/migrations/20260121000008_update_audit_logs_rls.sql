-- Migration: Update audit_logs RLS policies for staff access
-- Purpose: Allow staff with appropriate roles to read audit logs
-- Part of Phase 2: Customer Accounts + Staff Foundation

-- Drop existing authenticated policy (if any)
DROP POLICY IF EXISTS "Authenticated can read audit logs" ON audit_logs;

-- Policy: Staff with super_admin or admin_ops can read audit logs
DROP POLICY IF EXISTS "Staff with admin roles can read audit logs" ON audit_logs;
CREATE POLICY "Staff with admin roles can read audit logs" ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    has_any_role(auth.uid(), ARRAY['super_admin', 'admin_ops'])
  );

-- Policy: Staff can read their own audit logs
DROP POLICY IF EXISTS "Staff can read own audit logs" ON audit_logs;
CREATE POLICY "Staff can read own audit logs" ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    actor_id = auth.uid()
  );

-- Policy: Customers can read their own audit logs
DROP POLICY IF EXISTS "Customers can read own audit logs" ON audit_logs;
CREATE POLICY "Customers can read own audit logs" ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    actor_type = 'customer' AND actor_id = auth.uid()
  );

COMMENT ON POLICY "Staff with admin roles can read audit logs" ON audit_logs IS 'Super admins and admin ops can read all audit logs';
COMMENT ON POLICY "Staff can read own audit logs" ON audit_logs IS 'Staff can read audit logs where they are the actor';
COMMENT ON POLICY "Customers can read own audit logs" ON audit_logs IS 'Customers can read their own audit logs';
