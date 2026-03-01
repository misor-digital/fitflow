-- ============================================================================
-- Delivery Confirmation: shipped_at column, reminders table, config seed
-- ============================================================================

-- ============================================================================
-- 1. Add shipped_at to orders
-- ============================================================================

ALTER TABLE orders ADD COLUMN shipped_at TIMESTAMPTZ;

COMMENT ON COLUMN orders.shipped_at IS 'Timestamp when the order transitioned to shipped status. Set by the application DAL.';

CREATE INDEX idx_orders_shipped_at ON orders(shipped_at) WHERE status = 'shipped';

-- ============================================================================
-- 2. Backfill shipped_at for existing shipped/delivered orders
-- ============================================================================

UPDATE orders o
SET shipped_at = h.shipped_at
FROM (
  SELECT DISTINCT ON (order_id) order_id, created_at AS shipped_at
  FROM order_status_history
  WHERE to_status = 'shipped'
  ORDER BY order_id, created_at ASC
) h
WHERE o.id = h.order_id
  AND o.shipped_at IS NULL;

-- ============================================================================
-- 3. Create delivery_confirmation_reminders table
-- ============================================================================

CREATE TABLE delivery_confirmation_reminders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reminder_number  SMALLINT NOT NULL CHECK (reminder_number BETWEEN 1 AND 3),
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(order_id, reminder_number)
);

-- Indexes
CREATE INDEX idx_dcr_order ON delivery_confirmation_reminders(order_id);

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE delivery_confirmation_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY dcr_service_role ON delivery_confirmation_reminders
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- Grants
-- ============================================================================

GRANT ALL ON delivery_confirmation_reminders TO service_role;

-- ============================================================================
-- 4. Seed delivery confirmation config
-- ============================================================================

INSERT INTO site_config (key, value, description, value_type) VALUES
  ('DELIVERY_CONFIRMATION_DELAY_DAYS', '3', 'Number of days after shipping before the first delivery confirmation reminder is sent', 'number')
ON CONFLICT (key) DO NOTHING;
