-- ============================================================================
-- Order Price History Table
-- Audit trail for price/promo changes on existing orders by admin staff
-- ============================================================================

CREATE TABLE order_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id),
  change_type TEXT NOT NULL,
  prev_promo_code TEXT,
  prev_discount_percent NUMERIC(5,2),
  prev_original_price_eur NUMERIC(10,2),
  prev_final_price_eur NUMERIC(10,2),
  new_promo_code TEXT,
  new_discount_percent NUMERIC(5,2),
  new_original_price_eur NUMERIC(10,2),
  new_final_price_eur NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_order_price_history_order_id ON order_price_history(order_id);

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE order_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access order_price_history"
  ON order_price_history FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- Grants
-- ============================================================================

GRANT ALL ON order_price_history TO service_role;

-- ============================================================================
-- Table Comment
-- ============================================================================

COMMENT ON TABLE order_price_history IS 'Audit trail for price/promo changes on existing orders by admin staff';

-- ============================================================================
-- Decrement Promo Usage RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION decrement_promo_usage(
  p_code TEXT,
  p_user_id UUID DEFAULT NULL,
  p_order_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_promo_id UUID;
BEGIN
  -- Atomically decrement the global counter (floored at 0)
  UPDATE promo_codes
  SET current_uses = GREATEST(current_uses - 1, 0)
  WHERE UPPER(code) = UPPER(p_code)
  RETURNING id INTO v_promo_id;

  -- Remove per-user usage record if order_id is provided
  IF v_promo_id IS NOT NULL AND p_order_id IS NOT NULL THEN
    DELETE FROM promo_code_usages
    WHERE promo_code_id = v_promo_id
      AND order_id = p_order_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
