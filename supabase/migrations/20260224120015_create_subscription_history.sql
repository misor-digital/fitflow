-- ============================================================================
-- Subscription History (audit trail)
-- ============================================================================

CREATE TABLE subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE subscription_history IS 'Audit trail for subscription lifecycle events';
COMMENT ON COLUMN subscription_history.subscription_id IS 'FK to parent subscription — cascade deletes history when subscription is removed';
COMMENT ON COLUMN subscription_history.action IS 'Event type: created, paused, resumed, cancelled, expired, preferences_updated, address_changed, frequency_changed, order_generated';
COMMENT ON COLUMN subscription_history.details IS 'JSONB payload with before/after snapshots or contextual data';
COMMENT ON COLUMN subscription_history.performed_by IS 'FK to auth.users — the user or admin who triggered the action';

-- Indexes
CREATE INDEX idx_sub_history_sub ON subscription_history(subscription_id, created_at DESC);

-- RLS
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Users can read history for their own subscriptions
CREATE POLICY "sub_history_select_own" ON subscription_history
  FOR SELECT TO authenticated
  USING (
    subscription_id IN (
      SELECT id FROM subscriptions WHERE user_id = auth.uid()
    )
  );

-- Staff can read all subscription history
CREATE POLICY "sub_history_staff_read" ON subscription_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
      AND up.staff_role IN ('super_admin', 'admin', 'manager', 'support', 'warehouse')
    )
  );

-- Service role has full access
CREATE POLICY "sub_history_service_role" ON subscription_history
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Grants
GRANT SELECT ON subscription_history TO authenticated;
GRANT ALL ON subscription_history TO service_role;
