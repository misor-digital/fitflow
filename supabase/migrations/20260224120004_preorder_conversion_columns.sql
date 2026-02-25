-- ============================================================================
-- Preorder Conversion Tracking
-- ============================================================================

-- 1. Create conversion status enum
CREATE TYPE preorder_conversion_status AS ENUM ('pending', 'converted', 'expired');

-- 2. Add conversion columns to preorders
ALTER TABLE preorders
  ADD COLUMN conversion_token UUID UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN conversion_token_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
  ADD COLUMN conversion_status preorder_conversion_status NOT NULL DEFAULT 'pending',
  ADD COLUMN converted_to_order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

-- 3. Backfill existing preorders with tokens
-- (DEFAULT handles new rows, but existing rows need explicit update)
UPDATE preorders
SET
  conversion_token = gen_random_uuid(),
  conversion_token_expires_at = NOW() + INTERVAL '90 days',
  conversion_status = 'pending'
WHERE conversion_token IS NULL;

-- 4. Index for fast token lookup
CREATE INDEX idx_preorders_conversion_token
  ON preorders(conversion_token)
  WHERE conversion_token IS NOT NULL;

-- 5. Index for conversion status filtering (admin views)
CREATE INDEX idx_preorders_conversion_status
  ON preorders(conversion_status);

-- 6. Comments
COMMENT ON COLUMN preorders.conversion_token IS 'UUID token for the preorder-to-order conversion link';
COMMENT ON COLUMN preorders.conversion_token_expires_at IS 'Expiry timestamp for the conversion token (default: 90 days from creation)';
COMMENT ON COLUMN preorders.conversion_status IS 'Tracks whether this preorder has been converted to a full order';
COMMENT ON COLUMN preorders.converted_to_order_id IS 'FK to the order created from this preorder (if converted)';
