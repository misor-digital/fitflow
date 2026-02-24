-- ============================================================================
-- Subscriptions Table
-- ============================================================================

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  box_type TEXT NOT NULL,
  status subscription_status NOT NULL DEFAULT 'active',
  frequency TEXT NOT NULL DEFAULT 'monthly',

  -- Personalization preferences (stored independently — updates affect future orders only)
  wants_personalization BOOLEAN NOT NULL DEFAULT false,
  sports TEXT[],
  sport_other TEXT,
  colors TEXT[],
  flavors TEXT[],
  flavor_other TEXT,
  dietary TEXT[],
  dietary_other TEXT,
  size_upper TEXT,
  size_lower TEXT,
  additional_notes TEXT,

  -- Pricing
  promo_code TEXT,
  discount_percent NUMERIC(5,2),
  base_price_eur NUMERIC(10,2) NOT NULL,
  current_price_eur NUMERIC(10,2) NOT NULL,

  -- Address
  default_address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,

  -- Cycle tracking
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_cycle_id UUID REFERENCES delivery_cycles(id) ON DELETE SET NULL,
  last_delivered_cycle_id UUID REFERENCES delivery_cycles(id) ON DELETE SET NULL,

  -- Lifecycle timestamps
  paused_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_frequency CHECK (frequency IN ('monthly', 'seasonal')),
  CONSTRAINT valid_sub_box_type CHECK (box_type IN ('monthly-standard', 'monthly-premium'))
);

COMMENT ON TABLE subscriptions IS 'Active and historical subscriptions — one row per subscriber per box type';
COMMENT ON COLUMN subscriptions.user_id IS 'FK to auth.users — subscriptions require authentication';
COMMENT ON COLUMN subscriptions.box_type IS 'monthly-standard or monthly-premium';
COMMENT ON COLUMN subscriptions.status IS 'Lifecycle state: active, paused, cancelled, expired';
COMMENT ON COLUMN subscriptions.frequency IS 'Delivery frequency: monthly (every cycle) or seasonal (every 3rd cycle)';
COMMENT ON COLUMN subscriptions.wants_personalization IS 'Whether subscriber opted for personalized boxes';
COMMENT ON COLUMN subscriptions.base_price_eur IS 'Original price per cycle in EUR';
COMMENT ON COLUMN subscriptions.current_price_eur IS 'Current price per cycle in EUR (after any discounts)';
COMMENT ON COLUMN subscriptions.default_address_id IS 'Default shipping address for auto-generated orders';
COMMENT ON COLUMN subscriptions.first_cycle_id IS 'The first delivery cycle this subscription participates in';
COMMENT ON COLUMN subscriptions.last_delivered_cycle_id IS 'Most recent cycle with an order generated for this subscription';
COMMENT ON COLUMN subscriptions.paused_at IS 'Timestamp when subscription was paused';
COMMENT ON COLUMN subscriptions.cancelled_at IS 'Timestamp when subscription was cancelled';
COMMENT ON COLUMN subscriptions.cancellation_reason IS 'Optional reason for cancellation';

-- Indexes
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_active ON subscriptions(status) WHERE status = 'active';
CREATE INDEX idx_subscriptions_first_cycle ON subscriptions(first_cycle_id) WHERE first_cycle_id IS NOT NULL;

-- Trigger: auto-update updated_at
CREATE TRIGGER trigger_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscriptions
CREATE POLICY "subscriptions_select_own" ON subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own subscriptions (but NOT change status directly)
CREATE POLICY "subscriptions_update_own" ON subscriptions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    -- Prevent users from changing status directly via RLS
    -- Status changes MUST go through the service-role API
    AND status = (SELECT status FROM subscriptions WHERE id = subscriptions.id)
  );

-- Staff with ORDER_VIEW_ROLES can read all subscriptions
CREATE POLICY "staff_read_subscriptions" ON subscriptions
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
CREATE POLICY "subscriptions_service_role" ON subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Grants
GRANT SELECT, UPDATE ON subscriptions TO authenticated;
GRANT ALL ON subscriptions TO service_role;
