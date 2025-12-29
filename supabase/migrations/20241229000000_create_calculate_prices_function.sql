-- Migration: Create calculate_box_prices function
-- This function calculates all box prices with optional promo code discount in a single query
-- Eliminates multiple round-trips to the database

-- Drop existing type and function if they exist
DROP FUNCTION IF EXISTS calculate_box_prices(TEXT);
DROP TYPE IF EXISTS box_price_info CASCADE;

-- Create the return type for the function (using plain NUMERIC without precision)
CREATE TYPE box_price_info AS (
  box_type_id TEXT,
  box_type_name TEXT,
  original_price_eur NUMERIC,
  original_price_bgn NUMERIC,
  discount_percent INTEGER,
  discount_amount_eur NUMERIC,
  discount_amount_bgn NUMERIC,
  final_price_eur NUMERIC,
  final_price_bgn NUMERIC
);

-- Create the function to calculate all box prices
CREATE OR REPLACE FUNCTION calculate_box_prices(p_promo_code TEXT DEFAULT NULL)
RETURNS SETOF box_price_info
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_discount_percent INTEGER := 0;
  v_eur_to_bgn_rate NUMERIC := 1.9558;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Get EUR to BGN rate from site_config
  SELECT CAST(value AS NUMERIC) INTO v_eur_to_bgn_rate
  FROM site_config
  WHERE key = 'EUR_TO_BGN_RATE';
  
  -- If no rate found, use default
  IF v_eur_to_bgn_rate IS NULL THEN
    v_eur_to_bgn_rate := 1.9558;
  END IF;

  -- Get discount percent from promo code if provided
  IF p_promo_code IS NOT NULL AND p_promo_code != '' THEN
    SELECT discount_percent INTO v_discount_percent
    FROM promo_codes
    WHERE UPPER(code) = UPPER(p_promo_code)
      AND is_enabled = true
      AND (starts_at IS NULL OR starts_at <= v_now)
      AND (ends_at IS NULL OR ends_at > v_now)
      AND (max_uses IS NULL OR current_uses < max_uses);
    
    -- If no valid promo found, discount stays 0
    IF v_discount_percent IS NULL THEN
      v_discount_percent := 0;
    END IF;
  END IF;

  -- Return all enabled box types with calculated prices
  RETURN QUERY
  SELECT
    bt.id::TEXT AS box_type_id,
    bt.name::TEXT AS box_type_name,
    bt.price_eur::NUMERIC AS original_price_eur,
    ROUND(bt.price_eur * v_eur_to_bgn_rate, 2)::NUMERIC AS original_price_bgn,
    v_discount_percent AS discount_percent,
    ROUND((v_discount_percent::NUMERIC / 100) * bt.price_eur, 2)::NUMERIC AS discount_amount_eur,
    ROUND((v_discount_percent::NUMERIC / 100) * bt.price_eur * v_eur_to_bgn_rate, 2)::NUMERIC AS discount_amount_bgn,
    ROUND(bt.price_eur * (1 - v_discount_percent::NUMERIC / 100), 2)::NUMERIC AS final_price_eur,
    ROUND(bt.price_eur * (1 - v_discount_percent::NUMERIC / 100) * v_eur_to_bgn_rate, 2)::NUMERIC AS final_price_bgn
  FROM box_types bt
  WHERE bt.is_enabled = true
  ORDER BY bt.sort_order;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION calculate_box_prices(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION calculate_box_prices(TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION calculate_box_prices IS 'Calculates all box prices with optional promo code discount. Returns all enabled box types with original and final prices in EUR and BGN.';
