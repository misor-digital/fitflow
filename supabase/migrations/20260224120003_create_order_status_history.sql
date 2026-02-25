-- ============================================================================
-- Order Status History Table
-- ============================================================================

CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status order_status,
  to_status order_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY history_select_own ON order_status_history
  FOR SELECT TO authenticated
  USING (order_id IN (SELECT id FROM orders WHERE user_id = auth.uid()));

CREATE POLICY history_service_role ON order_status_history
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Grants
-- ============================================================================

GRANT SELECT ON order_status_history TO authenticated;
GRANT ALL ON order_status_history TO service_role;

-- ============================================================================
-- Auto-insert trigger for order status changes
-- ============================================================================

CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes)
    VALUES (NEW.id, OLD.status, NEW.status, NULL, NULL);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_order_status_change
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_status_change();
