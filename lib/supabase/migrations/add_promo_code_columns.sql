-- Migration: Add promo code and discount columns to preorders table
-- Run this SQL in your Supabase SQL Editor to add promo code support

-- Add promo_code column
ALTER TABLE preorders 
ADD COLUMN IF NOT EXISTS promo_code TEXT DEFAULT NULL;

-- Add discount column as JSONB to store discount details
ALTER TABLE preorders 
ADD COLUMN IF NOT EXISTS discount JSONB DEFAULT NULL;

-- Create index on promo_code for analytics
CREATE INDEX IF NOT EXISTS idx_preorders_promo_code ON preorders(promo_code) WHERE promo_code IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN preorders.promo_code IS 'Applied promo code (e.g., FITFLOW10)';
COMMENT ON COLUMN preorders.discount IS 'Discount details as JSON: {code, discount_type, discount_value, discount_amount, description}';
