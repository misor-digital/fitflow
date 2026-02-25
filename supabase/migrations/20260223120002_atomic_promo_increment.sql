CREATE OR REPLACE FUNCTION increment_promo_usage(p_code TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE promo_codes
  SET current_uses = current_uses + 1
  WHERE UPPER(code) = UPPER(p_code);
END;
$$ LANGUAGE plpgsql;
