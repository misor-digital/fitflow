-- Migration: Create promo_codes table
-- This table stores promotional discount codes
-- Replaces hardcoded PROMO_CODES constant

-- Create the promo_codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,  -- The promo code string (e.g., 'FITFLOW10')
  discount_percent NUMERIC(5,2) NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  description TEXT,  -- Internal description/notes
  is_enabled BOOLEAN NOT NULL DEFAULT true,  -- Quick enable/disable
  starts_at TIMESTAMPTZ,  -- Optional start date
  ends_at TIMESTAMPTZ,  -- Optional end date
  max_uses INTEGER,  -- Optional max usage limit (null = unlimited)
  current_uses INTEGER NOT NULL DEFAULT 0,  -- Track usage count
  min_order_value_eur NUMERIC(10,2),  -- Optional minimum order value
  applicable_box_types TEXT[],  -- Optional: restrict to specific box types (null = all)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique index on uppercase code for case-insensitive lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_codes_code_unique ON promo_codes(UPPER(code));

-- Create index for active promo codes lookup
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_enabled, starts_at, ends_at) 
  WHERE is_enabled = true;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_promo_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_promo_codes_updated_at ON promo_codes;
CREATE TRIGGER update_promo_codes_updated_at
  BEFORE UPDATE ON promo_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_promo_codes_updated_at();

-- Enable Row Level Security
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous to validate promo codes (read-only, limited fields)
-- Note: We use service_role for actual validation to prevent code enumeration
DROP POLICY IF EXISTS "Allow service role full access promo_codes" ON promo_codes;
CREATE POLICY "Allow service role full access promo_codes" ON promo_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No anon/authenticated read access - promo validation goes through API
-- This prevents users from enumerating all promo codes

-- Grant permissions (service_role only for security)
GRANT ALL ON promo_codes TO service_role;

-- Seed initial data (matching current hardcoded values)
INSERT INTO promo_codes (code, discount_percent, description, is_enabled) VALUES
  ('FITFLOW10', 10, 'Launch promo - 10% discount', true),
  ('FITFLOW25', 25, 'Special promo - 25% discount', true)
ON CONFLICT (UPPER(code)) DO UPDATE SET
  discount_percent = EXCLUDED.discount_percent,
  description = EXCLUDED.description,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

-- Add comments for documentation
COMMENT ON TABLE promo_codes IS 'Promotional discount codes for checkout';
COMMENT ON COLUMN promo_codes.code IS 'The promo code string (case-insensitive)';
COMMENT ON COLUMN promo_codes.discount_percent IS 'Discount percentage (1-100)';
COMMENT ON COLUMN promo_codes.is_enabled IS 'Quick toggle to enable/disable code';
COMMENT ON COLUMN promo_codes.starts_at IS 'Optional: code becomes valid after this time';
COMMENT ON COLUMN promo_codes.ends_at IS 'Optional: code expires after this time';
COMMENT ON COLUMN promo_codes.max_uses IS 'Optional: maximum number of times code can be used';
COMMENT ON COLUMN promo_codes.current_uses IS 'Counter for how many times code has been used';
COMMENT ON COLUMN promo_codes.applicable_box_types IS 'Optional: array of box_type IDs this code applies to';
