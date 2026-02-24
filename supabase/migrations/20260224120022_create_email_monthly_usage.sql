-- ============================================================================
-- Email Monthly Usage Tracking
-- ============================================================================
-- Tracks monthly email volume against Brevo plan limit (Starter: 5,000/month).
-- No daily cap on Starter plan — monthly is the only constraint.

CREATE TABLE email_monthly_usage (
  month               DATE PRIMARY KEY,                  -- First day of month (e.g. '2026-03-01')
  transactional_sent  INTEGER NOT NULL DEFAULT 0,
  campaign_sent       INTEGER NOT NULL DEFAULT 0,
  total_sent          INTEGER GENERATED ALWAYS AS (transactional_sent + campaign_sent) STORED,
  monthly_limit       INTEGER NOT NULL DEFAULT 5000,     -- Matches Brevo Starter plan
  alert_sent_80       BOOLEAN NOT NULL DEFAULT false,    -- Prevent duplicate 80% threshold alerts
  alert_sent_95       BOOLEAN NOT NULL DEFAULT false     -- Prevent duplicate 95% threshold alerts
);

COMMENT ON TABLE email_monthly_usage IS 'Monthly email send volume tracking against Brevo plan limits';
COMMENT ON COLUMN email_monthly_usage.month IS 'First day of the month this row tracks (e.g. 2026-03-01)';
COMMENT ON COLUMN email_monthly_usage.monthly_limit IS 'Email send limit from Brevo plan — Starter: 5000, adjustable on upgrade';

-- RLS
ALTER TABLE email_monthly_usage ENABLE ROW LEVEL SECURITY;

-- Staff can read
CREATE POLICY "emu_staff_read" ON email_monthly_usage
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
    )
  );

-- Service role: full access
CREATE POLICY "emu_service_role" ON email_monthly_usage
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Grants
GRANT SELECT ON email_monthly_usage TO authenticated;
GRANT ALL ON email_monthly_usage TO service_role;

-- ============================================================================
-- Atomic increment RPC for usage tracking
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_email_usage(
  p_type TEXT,       -- 'transactional' or 'campaign'
  p_count INTEGER DEFAULT 1
) RETURNS TABLE (
  current_total INTEGER,
  current_limit INTEGER,
  is_over_limit BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_month DATE := date_trunc('month', CURRENT_DATE)::date;
  v_total INTEGER;
  v_limit INTEGER;
BEGIN
  -- Upsert: create month row if it doesn't exist
  INSERT INTO email_monthly_usage (month)
  VALUES (v_month)
  ON CONFLICT (month) DO NOTHING;

  -- Atomic increment based on type
  IF p_type = 'transactional' THEN
    UPDATE email_monthly_usage
    SET transactional_sent = transactional_sent + p_count
    WHERE month = v_month;
  ELSIF p_type = 'campaign' THEN
    UPDATE email_monthly_usage
    SET campaign_sent = campaign_sent + p_count
    WHERE month = v_month;
  ELSE
    RAISE EXCEPTION 'Invalid email type: %. Must be transactional or campaign.', p_type;
  END IF;

  -- Return current state
  SELECT emu.total_sent, emu.monthly_limit, (emu.total_sent > emu.monthly_limit)
  INTO v_total, v_limit
  FROM email_monthly_usage emu
  WHERE emu.month = v_month;

  RETURN QUERY SELECT v_total, v_limit, (v_total > v_limit);
END;
$$;

COMMENT ON FUNCTION increment_email_usage IS 'Atomically increment email usage counter and return current state. Type must be transactional or campaign.';
