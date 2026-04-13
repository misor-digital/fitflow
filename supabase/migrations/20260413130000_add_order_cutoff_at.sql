-- ============================================================================
-- Add order_cutoff_at to delivery_cycles
-- ============================================================================
-- Adds a timestamp column that defines the deadline for accepting orders
-- for a given delivery cycle. After this datetime, new subscriptions are
-- not assigned to the cycle ("orphaned") and must be manually backfilled.
-- ============================================================================

-- 1. Add nullable column first (for backfill)
ALTER TABLE delivery_cycles
  ADD COLUMN order_cutoff_at TIMESTAMPTZ;

-- 2. Backfill existing rows: delivery_date - 2 days at 14:00 Europe/Sofia
UPDATE delivery_cycles
SET order_cutoff_at = (delivery_date - INTERVAL '2 days') + TIME '14:00:00'
WHERE order_cutoff_at IS NULL;

-- 3. Set NOT NULL after backfill
ALTER TABLE delivery_cycles
  ALTER COLUMN order_cutoff_at SET NOT NULL;

-- 4. CHECK constraint: cutoff must be before or on delivery date
ALTER TABLE delivery_cycles
  ADD CONSTRAINT chk_cutoff_before_delivery
  CHECK (order_cutoff_at <= (delivery_date + TIME '23:59:59'));

-- 5. Index for eligibility queries (cron/manual order generation)
CREATE INDEX idx_delivery_cycles_cutoff
  ON delivery_cycles (order_cutoff_at)
  WHERE status = 'upcoming';

-- 6. Add configurable display window for cutoff countdown (days)
INSERT INTO site_config (key, value, description, value_type) VALUES
  ('ORDER_CUTOFF_DISPLAY_DAYS', '5', 'Number of days before cutoff to show countdown banner and popups', 'number')
ON CONFLICT (key) DO NOTHING;
