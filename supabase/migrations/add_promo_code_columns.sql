-- Migration: Add promo code columns to preorders table
-- Run this SQL in your Supabase SQL Editor to add promo code support

-- Add promo code columns
ALTER TABLE preorders
ADD COLUMN IF NOT EXISTS promo_code TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS original_price_eur NUMERIC(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS final_price_eur NUMERIC(10,2) DEFAULT NULL;

-- Add index on promo_code for analytics queries
CREATE INDEX IF NOT EXISTS idx_preorders_promo_code ON preorders(promo_code) WHERE promo_code IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN preorders.promo_code IS 'Applied promo code (e.g., FITFLOW10, FITFLOW25)';
COMMENT ON COLUMN preorders.discount_percent IS 'Discount percentage applied (e.g., 10, 25)';
COMMENT ON COLUMN preorders.original_price_eur IS 'Original price in EUR before discount';
COMMENT ON COLUMN preorders.final_price_eur IS 'Final price in EUR after discount';
