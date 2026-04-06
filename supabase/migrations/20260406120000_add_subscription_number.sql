-- ============================================================================
-- Add human-readable subscription numbers (FF-SUB-DDMMYY-XXXXXX)
-- ============================================================================

-- 1. Create the generator function (accepts optional timestamp for backfill)
CREATE OR REPLACE FUNCTION generate_subscription_id(ts TIMESTAMPTZ DEFAULT NOW())
RETURNS TEXT AS $$
DECLARE
  date_part TEXT;
  random_part TEXT;
  new_sub_id TEXT;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
BEGIN
  date_part := TO_CHAR(ts, 'DDMMYY');
  random_part := '';
  FOR i IN 1..6 LOOP
    random_part := random_part || SUBSTR(chars, FLOOR(RANDOM() * LENGTH(chars) + 1)::INT, 1);
  END LOOP;
  new_sub_id := 'FF-SUB-' || date_part || '-' || random_part;
  RETURN new_sub_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Add column as nullable first (so we can backfill before enforcing NOT NULL)
ALTER TABLE subscriptions
ADD COLUMN subscription_number TEXT;

-- 3. Backfill existing rows using their actual created_at date
UPDATE subscriptions
SET subscription_number = generate_subscription_id(created_at)
WHERE subscription_number IS NULL;

-- 4. Now enforce NOT NULL + UNIQUE + default for new rows
ALTER TABLE subscriptions
ALTER COLUMN subscription_number SET NOT NULL,
ALTER COLUMN subscription_number SET DEFAULT generate_subscription_id(),
ADD CONSTRAINT subscriptions_subscription_number_key UNIQUE (subscription_number);

-- 5. Index for search queries
CREATE INDEX idx_subscriptions_subscription_number ON subscriptions(subscription_number);
