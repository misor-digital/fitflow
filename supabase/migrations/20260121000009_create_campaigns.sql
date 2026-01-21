-- Migration: Create campaigns table
-- Part of Phase 3: Marketing & Internal Tooling
-- Created: 2026-01-21

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  created_by UUID NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
  sent_at TIMESTAMPTZ,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  successful_sends INTEGER NOT NULL DEFAULT 0,
  failed_sends INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_created_by ON campaigns(created_by);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at DESC);
CREATE INDEX idx_campaigns_sent_at ON campaigns(sent_at DESC);

-- Enable RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaigns
-- Staff users with marketing roles can view all campaigns
CREATE POLICY "Staff can view campaigns"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_users su
      WHERE su.user_id = auth.uid()
      AND su.is_active = true
      AND EXISTS (
        SELECT 1 FROM staff_role_assignments sra
        JOIN roles r ON r.id = sra.role_id
        WHERE sra.staff_user_id = su.id
        AND r.name IN ('super_admin', 'admin_ops', 'marketing_manager', 'marketing_operator')
      )
    )
  );

-- Marketing managers and admin_ops can create campaigns
CREATE POLICY "Marketing managers can create campaigns"
  ON campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_users su
      WHERE su.user_id = auth.uid()
      AND su.is_active = true
      AND EXISTS (
        SELECT 1 FROM staff_role_assignments sra
        JOIN roles r ON r.id = sra.role_id
        WHERE sra.staff_user_id = su.id
        AND r.name IN ('super_admin', 'admin_ops', 'marketing_manager')
      )
    )
  );

-- Marketing managers and admin_ops can update campaigns
CREATE POLICY "Marketing managers can update campaigns"
  ON campaigns
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_users su
      WHERE su.user_id = auth.uid()
      AND su.is_active = true
      AND EXISTS (
        SELECT 1 FROM staff_role_assignments sra
        JOIN roles r ON r.id = sra.role_id
        WHERE sra.staff_user_id = su.id
        AND r.name IN ('super_admin', 'admin_ops', 'marketing_manager', 'marketing_operator')
      )
    )
  );

-- Only marketing managers and admin_ops can delete campaigns
CREATE POLICY "Marketing managers can delete campaigns"
  ON campaigns
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_users su
      WHERE su.user_id = auth.uid()
      AND su.is_active = true
      AND EXISTS (
        SELECT 1 FROM staff_role_assignments sra
        JOIN roles r ON r.id = sra.role_id
        WHERE sra.staff_user_id = su.id
        AND r.name IN ('super_admin', 'admin_ops', 'marketing_manager')
      )
    )
  );

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();

-- Add comment
COMMENT ON TABLE campaigns IS 'Newsletter email campaigns for marketing';
