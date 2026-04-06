-- ============================================================================
-- Add human-readable subscription numbers (FF-SUB-DDMMYY-XXXXXX)
-- ============================================================================

-- 1. Create the generator function
CREATE OR REPLACE FUNCTION generate_subscription_id()
RETURNS TEXT AS $$
DECLARE
  date_part TEXT;
  random_part TEXT;
  new_sub_id TEXT;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
BEGIN
  date_part := TO_CHAR(NOW(), 'DDMMYY');
  random_part := '';
  FOR i IN 1..6 LOOP
    random_part := random_part || SUBSTR(chars, FLOOR(RANDOM() * LENGTH(chars) + 1)::INT, 1);
  END LOOP;
  new_sub_id := 'FF-SUB-' || date_part || '-' || random_part;
  RETURN new_sub_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Add subscription_number column with auto-generated default
ALTER TABLE subscriptions
ADD COLUMN subscription_number TEXT UNIQUE NOT NULL DEFAULT generate_subscription_id();

-- 3. Index for search queries
CREATE INDEX idx_subscriptions_subscription_number ON subscriptions(subscription_number);
