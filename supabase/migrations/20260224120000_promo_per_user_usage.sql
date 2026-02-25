-- Migration: Per-user promo code usage tracking
-- Adds max_uses_per_user column, promo_code_usages table, and updated RPCs

-- A. Add per-user limit column to promo_codes
ALTER TABLE promo_codes
ADD COLUMN max_uses_per_user INTEGER DEFAULT NULL;

COMMENT ON COLUMN promo_codes.max_uses_per_user IS 'Maximum times each user can use this code (NULL = unlimited)';

-- B. Create promo_code_usages junction table
CREATE TABLE promo_code_usages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent same order from being counted twice
CREATE UNIQUE INDEX idx_promo_code_usages_order
  ON promo_code_usages(promo_code_id, order_id)
  WHERE order_id IS NOT NULL;

-- Fast per-user usage count lookups
CREATE INDEX idx_promo_code_usages_user
  ON promo_code_usages(promo_code_id, user_id);

COMMENT ON TABLE promo_code_usages IS 'Audit trail of individual promo code redemptions per user';

ALTER TABLE promo_code_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access promo_code_usages"
  ON promo_code_usages FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT ALL ON promo_code_usages TO service_role;

-- C. Replace increment_promo_usage RPC (backwards-compatible)
CREATE OR REPLACE FUNCTION increment_promo_usage(
  p_code TEXT,
  p_user_id UUID DEFAULT NULL,
  p_order_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_promo_id UUID;
BEGIN
  -- Atomically increment the global counter
  UPDATE promo_codes
  SET current_uses = current_uses + 1
  WHERE UPPER(code) = UPPER(p_code)
  RETURNING id INTO v_promo_id;

  -- Record per-user usage if user_id is provided
  IF v_promo_id IS NOT NULL AND p_user_id IS NOT NULL THEN
    INSERT INTO promo_code_usages (promo_code_id, user_id, order_id)
    VALUES (v_promo_id, p_user_id, p_order_id)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- D. Create check_user_promo_usage RPC
CREATE OR REPLACE FUNCTION check_user_promo_usage(
  p_code TEXT,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM promo_code_usages pcu
  JOIN promo_codes pc ON pc.id = pcu.promo_code_id
  WHERE UPPER(pc.code) = UPPER(p_code)
    AND pcu.user_id = p_user_id;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql;
