-- ============================================================================
-- Add delivery cycle reference and order type to orders
-- ============================================================================

-- Add delivery cycle reference and order type discriminator to orders
ALTER TABLE orders
  ADD COLUMN delivery_cycle_id UUID REFERENCES delivery_cycles(id) ON DELETE SET NULL,
  ADD COLUMN order_type TEXT NOT NULL DEFAULT 'direct';

COMMENT ON COLUMN orders.delivery_cycle_id IS 'FK to delivery cycle — set for subscription-generated, mystery, and revealed orders';
COMMENT ON COLUMN orders.order_type IS 'Order origin: subscription (auto-generated), onetime-mystery (ships with cycle batch), onetime-revealed (ships ASAP, past cycle contents), direct (legacy/standard)';

-- Index for querying orders by cycle
CREATE INDEX idx_orders_delivery_cycle ON orders(delivery_cycle_id)
  WHERE delivery_cycle_id IS NOT NULL;

-- Index for querying by order type
CREATE INDEX idx_orders_order_type ON orders(order_type);

-- Validate order_type values
ALTER TABLE orders
  ADD CONSTRAINT valid_order_type CHECK (
    order_type IN ('subscription', 'onetime-mystery', 'onetime-revealed', 'direct')
  );
