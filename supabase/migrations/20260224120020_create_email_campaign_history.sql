-- ============================================================================
-- Email Campaign History (Audit Trail)
-- ============================================================================
-- Domain-specific audit table following the pattern of order_status_history
-- and subscription_history. Records every state change with who, when, and why.

CREATE TABLE email_campaign_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  action          TEXT NOT NULL,                        -- 'created', 'updated', 'scheduled', 'started', 'paused', 'resumed', 'cancelled', 'completed', 'failed'
  changed_by      UUID NOT NULL REFERENCES auth.users(id),
  notes           TEXT,                                 -- Optional context (e.g. "paused due to content error")
  metadata        JSONB DEFAULT '{}'::jsonb,            -- Action-specific data (e.g. recipientCount, filter, previousStatus)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE email_campaign_history IS 'Audit trail for email campaign lifecycle — every state change is logged with the staff member who performed it';
COMMENT ON COLUMN email_campaign_history.action IS 'Campaign action: created, updated, scheduled, started, paused, resumed, cancelled, completed, failed';
COMMENT ON COLUMN email_campaign_history.changed_by IS 'Staff member UUID who performed this action';
COMMENT ON COLUMN email_campaign_history.metadata IS 'Action-specific metadata (e.g. {recipientCount, filter, previousStatus, errorDetail})';

-- Indexes
CREATE INDEX idx_ech_campaign ON email_campaign_history(campaign_id, created_at DESC);

-- RLS
ALTER TABLE email_campaign_history ENABLE ROW LEVEL SECURITY;

-- Staff can read all history
CREATE POLICY "ech_staff_read" ON email_campaign_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
    )
  );

-- Service role: full access
CREATE POLICY "ech_service_role" ON email_campaign_history
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Grants
GRANT SELECT ON email_campaign_history TO authenticated;
GRANT ALL ON email_campaign_history TO service_role;
