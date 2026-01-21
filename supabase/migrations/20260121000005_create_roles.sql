-- Migration: Create roles table
-- Purpose: Define available staff roles for RBAC
-- Part of Phase 2: Customer Accounts + Staff Foundation

-- Create the roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false, -- System roles cannot be deleted
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on name for fast lookups
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_roles_updated_at();

-- Enable Row Level Security
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read roles (to see their own roles)
DROP POLICY IF EXISTS "Authenticated can read roles" ON roles;
CREATE POLICY "Authenticated can read roles" ON roles
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Service role has full access
DROP POLICY IF EXISTS "Service role full access roles" ON roles;
CREATE POLICY "Service role full access roles" ON roles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON roles TO authenticated;
GRANT ALL ON roles TO service_role;

-- Add comments for documentation
COMMENT ON TABLE roles IS 'Staff roles for RBAC (Role-Based Access Control)';
COMMENT ON COLUMN roles.name IS 'Unique role name (e.g., super_admin, support)';
COMMENT ON COLUMN roles.description IS 'Human-readable description of role capabilities';
COMMENT ON COLUMN roles.is_system IS 'System roles cannot be deleted (prevents accidental removal)';

-- Seed system roles
INSERT INTO roles (name, description, is_system) VALUES
  ('super_admin', 'Full system access: create/edit/delete staff users, assign any role, manage all data, access all admin panels, view all audit logs, configure system settings, manage roles themselves', true),
  ('admin_ops', 'Operational admin: manage preorders, customers, subscriptions, view reports, manage catalog, manage promo codes, view audit logs (cannot create staff or assign roles)', true),
  ('developer', 'Technical access: view database schema, run migrations, access logs, manage integrations, configure APIs, view system health (no customer PII access unless needed for debugging)', true),
  ('support', 'Customer support: view/edit customer accounts, view/edit preorders via admin panel, send password reset links, view order history, add notes (cannot delete data or access financial info)', true),
  ('fulfillment', 'Order processing: view preorders, mark as fulfilled, update shipping status, export order lists, view inventory (cannot edit pricing or customer PII)', true),
  ('finance', 'Financial operations: view all orders with pricing, export financial reports, manage promo codes, view revenue analytics (cannot edit customer data or fulfill orders)', true),
  ('catalog_manager', 'Product management: manage box_types, options, site_config, upload product images (cannot access customer data or orders)', true),
  ('marketing_manager', 'Marketing strategy: manage newsletter campaigns, view subscriber lists, create promo codes, view analytics, export marketing reports (cannot access customer PII beyond email)', true),
  ('marketing_operator', 'Marketing execution: send newsletters, manage email templates, view campaign performance (read-only subscriber list)', true),
  ('customer', 'Customer portal: view own preorders, edit own profile, manage subscriptions, view order history, update payment methods (scoped to own data only)', true)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = NOW();

-- Create trigger to prevent deletion of system roles
CREATE OR REPLACE FUNCTION prevent_system_role_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_system = true THEN
    RAISE EXCEPTION 'Cannot delete system role: %', OLD.name;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_system_role_deletion_trigger ON roles;
CREATE TRIGGER prevent_system_role_deletion_trigger
  BEFORE DELETE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_system_role_deletion();

COMMENT ON FUNCTION prevent_system_role_deletion IS 'Prevents deletion of system roles';
