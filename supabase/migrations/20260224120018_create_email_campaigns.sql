-- ============================================================================
-- Email Campaigns Table
-- ============================================================================
-- Stores campaign definitions, targeting, scheduling, and progress.
-- Each campaign is created by a staff member and processed via the campaign engine.

CREATE TABLE email_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  subject         TEXT NOT NULL,
  template_id     INTEGER,                          -- Brevo template ID (nullable — for Brevo-managed campaigns)
  html_content    TEXT,                              -- Inline HTML (nullable — mutually exclusive with template_id)
  campaign_type   email_campaign_type NOT NULL,
  status          email_campaign_status NOT NULL DEFAULT 'draft',
  target_list_type target_list_type NOT NULL,
  target_filter   JSONB DEFAULT '{}'::jsonb,         -- Audience filter criteria (e.g. {"conversion_status":"pending"})
  params          JSONB DEFAULT '{}'::jsonb,         -- Global template variables for Brevo
  scheduled_at    TIMESTAMPTZ,                       -- When to send (null = manual trigger)
  started_at      TIMESTAMPTZ,                       -- When processing began
  completed_at    TIMESTAMPTZ,                       -- When all recipients processed
  total_recipients INTEGER NOT NULL DEFAULT 0,        -- Snapshot at campaign start
  sent_count      INTEGER NOT NULL DEFAULT 0,         -- Running counter
  failed_count    INTEGER NOT NULL DEFAULT 0,         -- Running counter
  brevo_campaign_id TEXT,                            -- Brevo's campaign ID (if using Campaign API)
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  updated_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Either template_id or html_content must be provided, not both
  CONSTRAINT email_campaigns_content_check CHECK (
    (template_id IS NOT NULL AND html_content IS NULL) OR
    (template_id IS NULL AND html_content IS NOT NULL) OR
    (template_id IS NULL AND html_content IS NULL)   -- drafts may have neither initially
  )
);

COMMENT ON TABLE email_campaigns IS 'Email campaign definitions with targeting, scheduling, and progress tracking';
COMMENT ON COLUMN email_campaigns.template_id IS 'Brevo template ID — used for Brevo-managed campaign emails';
COMMENT ON COLUMN email_campaigns.html_content IS 'Inline HTML content — used for code-managed campaign emails';
COMMENT ON COLUMN email_campaigns.target_filter IS 'JSONB filter criteria applied to the target audience (e.g. conversion_status, box_type)';
COMMENT ON COLUMN email_campaigns.params IS 'Global template variables passed to every recipient';
COMMENT ON COLUMN email_campaigns.brevo_campaign_id IS 'Brevo platform campaign ID when using their Campaign API for sending';

-- Indexes
CREATE INDEX idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX idx_email_campaigns_type ON email_campaigns(campaign_type);
CREATE INDEX idx_email_campaigns_scheduled ON email_campaigns(scheduled_at)
  WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;
CREATE INDEX idx_email_campaigns_created_by ON email_campaigns(created_by);

-- Trigger: auto-update updated_at
CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON email_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

-- Staff can read all campaigns
CREATE POLICY "email_campaigns_staff_read" ON email_campaigns
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
    )
  );

-- Admin/marketing staff can insert
CREATE POLICY "email_campaigns_staff_insert" ON email_campaigns
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
      AND up.staff_role IN ('super_admin', 'admin', 'marketing')
    )
  );

-- Admin/marketing staff can update
CREATE POLICY "email_campaigns_staff_update" ON email_campaigns
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
      AND up.staff_role IN ('super_admin', 'admin', 'marketing')
    )
  );

-- Service role: full access
CREATE POLICY "email_campaigns_service_role" ON email_campaigns
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Grants
GRANT SELECT ON email_campaigns TO authenticated;
GRANT ALL ON email_campaigns TO service_role;
