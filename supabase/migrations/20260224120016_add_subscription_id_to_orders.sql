-- ============================================================================
-- Add subscription_id FK to orders table
-- ============================================================================

-- Link orders to their parent subscription (for recurring subscription orders)
ALTER TABLE orders
  ADD COLUMN subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;

COMMENT ON COLUMN orders.subscription_id IS 'FK to parent subscription — set for auto-generated subscription cycle orders';

CREATE INDEX idx_orders_subscription ON orders(subscription_id)
  WHERE subscription_id IS NOT NULL;
