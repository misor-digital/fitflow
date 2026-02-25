-- ============================================================================
-- Email Campaign Recipients Table
-- ============================================================================
-- Per-campaign recipient list with individual delivery tracking.
-- Recipients are snapshotted at campaign creation to ensure consistency during multi-batch sends.

CREATE TABLE email_campaign_recipients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT,
  preorder_id     UUID REFERENCES preorders(id) ON DELETE SET NULL,
  params          JSONB DEFAULT '{}'::jsonb,           -- Per-recipient merge variables (e.g. conversionUrl, boxType)
  status          email_recipient_status NOT NULL DEFAULT 'pending',
  brevo_message_id TEXT,                               -- Brevo message ID for tracking
  sent_at         TIMESTAMPTZ,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT email_campaign_recipients_unique_email UNIQUE (campaign_id, email)
);

COMMENT ON TABLE email_campaign_recipients IS 'Individual recipients for each campaign with per-recipient params and delivery status';
COMMENT ON COLUMN email_campaign_recipients.params IS 'Per-recipient template variables (e.g. conversion URL with token)';
COMMENT ON COLUMN email_campaign_recipients.brevo_message_id IS 'Brevo message ID — used to correlate webhook events';

-- Indexes
CREATE INDEX idx_ecr_campaign_pending ON email_campaign_recipients(campaign_id)
  WHERE status = 'pending';
CREATE INDEX idx_ecr_campaign_status ON email_campaign_recipients(campaign_id, status);
CREATE INDEX idx_ecr_brevo_message ON email_campaign_recipients(brevo_message_id)
  WHERE brevo_message_id IS NOT NULL;

-- Trigger: auto-update updated_at
CREATE TRIGGER update_email_campaign_recipients_updated_at
  BEFORE UPDATE ON email_campaign_recipients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE email_campaign_recipients ENABLE ROW LEVEL SECURITY;

-- Staff can read
CREATE POLICY "ecr_staff_read" ON email_campaign_recipients
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
    )
  );

-- Service role: full access (campaign engine uses service_role)
CREATE POLICY "ecr_service_role" ON email_campaign_recipients
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Grants
GRANT SELECT ON email_campaign_recipients TO authenticated;
GRANT ALL ON email_campaign_recipients TO service_role;
