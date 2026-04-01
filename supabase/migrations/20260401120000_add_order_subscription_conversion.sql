-- Order-to-Subscription conversion tracking
-- Mirrors the preorder conversion pattern (conversion_token, conversion_status on preorders table)
ALTER TABLE orders
  ADD COLUMN subscription_conversion_token UUID UNIQUE,
  ADD COLUMN subscription_conversion_token_expires_at TIMESTAMPTZ,
  ADD COLUMN subscription_conversion_status TEXT DEFAULT NULL
    CHECK (subscription_conversion_status IN ('pending', 'converted', 'expired')),
  ADD COLUMN converted_to_subscription_id UUID UNIQUE
    REFERENCES subscriptions(id) ON DELETE SET NULL;

-- Partial index for fast token lookups
CREATE INDEX idx_orders_sub_conversion_token
  ON orders (subscription_conversion_token)
  WHERE subscription_conversion_token IS NOT NULL;

COMMENT ON COLUMN orders.subscription_conversion_token IS 'One-time UUID token for order-to-subscription conversion emails. Cleared after conversion.';
COMMENT ON COLUMN orders.subscription_conversion_token_expires_at IS 'Token expiry (default 90 days from generation).';
COMMENT ON COLUMN orders.subscription_conversion_status IS 'NULL = not targeted, pending = email sent, converted = subscription created, expired = token expired.';
COMMENT ON COLUMN orders.converted_to_subscription_id IS 'FK to the subscription created from this order. UNIQUE enforces one-to-one.';
