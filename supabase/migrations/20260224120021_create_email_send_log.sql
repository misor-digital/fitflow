-- ============================================================================
-- Email Send Log (Unified)
-- ============================================================================
-- Logs ALL email sends — both transactional and campaign.
-- Provides a single audit view for the admin dashboard.

CREATE TABLE email_send_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type          TEXT NOT NULL CHECK (email_type IN ('transactional', 'campaign')),
  email_category      TEXT NOT NULL,                     -- e.g. 'order-confirmation', 'sub-created', 'preorder-conversion'
  recipient_email     TEXT NOT NULL,
  recipient_name      TEXT,
  subject             TEXT,
  template_id         INTEGER,
  brevo_message_id    TEXT,
  campaign_id         UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
  status              email_log_status NOT NULL DEFAULT 'sent',
  params              JSONB,
  error               TEXT,
  related_entity_type TEXT,                              -- 'order', 'subscription', 'preorder'
  related_entity_id   UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE email_send_log IS 'Unified audit log for all email sends (transactional + campaign) — used by admin email dashboard';
COMMENT ON COLUMN email_send_log.email_category IS 'Descriptive category: order-confirmation, sub-created, sub-paused, preorder-conversion, cron-success, etc.';
COMMENT ON COLUMN email_send_log.related_entity_type IS 'Type of the related business entity (order, subscription, preorder)';
COMMENT ON COLUMN email_send_log.related_entity_id IS 'UUID of the related business entity';

-- Indexes
CREATE INDEX idx_esl_recipient ON email_send_log(recipient_email, created_at DESC);
CREATE INDEX idx_esl_category ON email_send_log(email_category, created_at DESC);
CREATE INDEX idx_esl_campaign ON email_send_log(campaign_id)
  WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_esl_brevo_message ON email_send_log(brevo_message_id)
  WHERE brevo_message_id IS NOT NULL;
CREATE INDEX idx_esl_related ON email_send_log(related_entity_type, related_entity_id)
  WHERE related_entity_type IS NOT NULL;
CREATE INDEX idx_esl_created ON email_send_log(created_at DESC);

-- RLS
ALTER TABLE email_send_log ENABLE ROW LEVEL SECURITY;

-- Staff can read all logs
CREATE POLICY "esl_staff_read" ON email_send_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
    )
  );

-- Service role: full access
CREATE POLICY "esl_service_role" ON email_send_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Grants
GRANT SELECT ON email_send_log TO authenticated;
GRANT ALL ON email_send_log TO service_role;
