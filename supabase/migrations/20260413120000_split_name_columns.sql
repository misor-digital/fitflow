-- ============================================================================
-- Split full_name → first_name + last_name across all tables
-- ============================================================================

-- ═══════════════════════════════════════════════
-- STEP 1: Add new columns (nullable for backfill)
-- ═══════════════════════════════════════════════

ALTER TABLE user_profiles
  ADD COLUMN first_name TEXT,
  ADD COLUMN last_name TEXT;

ALTER TABLE addresses
  ADD COLUMN first_name TEXT,
  ADD COLUMN last_name TEXT;

ALTER TABLE orders
  ADD COLUMN customer_first_name TEXT,
  ADD COLUMN customer_last_name TEXT;

ALTER TABLE preorders
  ADD COLUMN first_name TEXT,
  ADD COLUMN last_name TEXT;

ALTER TABLE email_campaign_recipients
  ADD COLUMN first_name TEXT,
  ADD COLUMN last_name TEXT;

-- ═══════════════════════════════════════════════
-- STEP 2: Backfill from existing full_name
-- ═══════════════════════════════════════════════

UPDATE user_profiles SET
  first_name = split_part(trim(full_name), ' ', 1),
  last_name = CASE
    WHEN position(' ' IN trim(full_name)) > 0
    THEN substring(trim(full_name) FROM position(' ' IN trim(full_name)) + 1)
    ELSE '-' END;

ALTER TABLE addresses DISABLE TRIGGER USER;
UPDATE addresses SET
  first_name = split_part(trim(full_name), ' ', 1),
  last_name = CASE
    WHEN position(' ' IN trim(full_name)) > 0
    THEN substring(trim(full_name) FROM position(' ' IN trim(full_name)) + 1)
    ELSE '-' END;
ALTER TABLE addresses ENABLE TRIGGER USER;

UPDATE orders SET
  customer_first_name = split_part(trim(customer_full_name), ' ', 1),
  customer_last_name = CASE
    WHEN position(' ' IN trim(customer_full_name)) > 0
    THEN substring(trim(customer_full_name) FROM position(' ' IN trim(customer_full_name)) + 1)
    ELSE '-' END;

UPDATE preorders SET
  first_name = split_part(trim(full_name), ' ', 1),
  last_name = CASE
    WHEN position(' ' IN trim(full_name)) > 0
    THEN substring(trim(full_name) FROM position(' ' IN trim(full_name)) + 1)
    ELSE '-' END;

UPDATE email_campaign_recipients SET
  first_name = split_part(trim(full_name), ' ', 1),
  last_name = CASE
    WHEN position(' ' IN trim(full_name)) > 0
    THEN substring(trim(full_name) FROM position(' ' IN trim(full_name)) + 1)
    ELSE NULL END
WHERE full_name IS NOT NULL;

-- ═══════════════════════════════════════════════
-- STEP 3: Backfill order shipping_address JSONB
-- ═══════════════════════════════════════════════

UPDATE orders SET shipping_address = shipping_address
  || jsonb_build_object(
    'first_name', split_part(trim(shipping_address->>'full_name'), ' ', 1),
    'last_name', CASE
      WHEN position(' ' IN trim(shipping_address->>'full_name')) > 0
      THEN substring(trim(shipping_address->>'full_name') FROM position(' ' IN trim(shipping_address->>'full_name')) + 1)
      ELSE '-' END
  )
WHERE shipping_address ? 'full_name';

-- ═══════════════════════════════════════════════
-- STEP 4: Add NOT NULL + CHECK constraints
-- ═══════════════════════════════════════════════

ALTER TABLE user_profiles
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name SET NOT NULL,
  ADD CONSTRAINT user_profiles_first_name_not_empty CHECK (char_length(trim(first_name)) >= 1),
  ADD CONSTRAINT user_profiles_last_name_not_empty CHECK (char_length(trim(last_name)) >= 1);

ALTER TABLE addresses
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name SET NOT NULL,
  ADD CONSTRAINT addresses_first_name_not_empty CHECK (char_length(trim(first_name)) >= 1),
  ADD CONSTRAINT addresses_last_name_not_empty CHECK (char_length(trim(last_name)) >= 1);

ALTER TABLE orders
  ALTER COLUMN customer_first_name SET NOT NULL,
  ALTER COLUMN customer_last_name SET NOT NULL,
  ADD CONSTRAINT orders_first_name_not_empty CHECK (char_length(trim(customer_first_name)) >= 1),
  ADD CONSTRAINT orders_last_name_not_empty CHECK (char_length(trim(customer_last_name)) >= 1);

ALTER TABLE preorders
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name SET NOT NULL,
  ADD CONSTRAINT preorders_first_name_not_empty CHECK (char_length(trim(first_name)) >= 1),
  ADD CONSTRAINT preorders_last_name_not_empty CHECK (char_length(trim(last_name)) >= 1);

-- email_campaign_recipients: stays nullable, no CHECK

-- ═══════════════════════════════════════════════
-- STEP 5: Drop old columns + update JSONB constraint
-- ═══════════════════════════════════════════════

ALTER TABLE user_profiles DROP COLUMN full_name;
ALTER TABLE addresses DROP COLUMN full_name;
ALTER TABLE preorders DROP COLUMN full_name;
ALTER TABLE email_campaign_recipients DROP COLUMN full_name;

-- Drop old JSONB constraint BEFORE removing full_name key from snapshots
ALTER TABLE orders DROP CONSTRAINT valid_shipping_address;

ALTER TABLE orders DROP COLUMN customer_full_name;

-- Remove full_name key from JSONB snapshots
UPDATE orders SET shipping_address = shipping_address - 'full_name';

-- Add new JSONB constraint referencing first_name/last_name
ALTER TABLE orders ADD CONSTRAINT valid_shipping_address CHECK (
  CASE
    WHEN delivery_method = 'speedy_office' THEN
      shipping_address ? 'first_name'
      AND shipping_address ? 'last_name'
      AND shipping_address ? 'phone'
      AND (shipping_address->>'phone') IS NOT NULL
      AND length(shipping_address->>'phone') > 0
      AND shipping_address ? 'speedy_office_id'
      AND shipping_address ? 'speedy_office_name'
    ELSE
      shipping_address ? 'city'
      AND shipping_address ? 'postal_code'
      AND shipping_address ? 'street_address'
      AND shipping_address ? 'first_name'
      AND shipping_address ? 'last_name'
      AND (shipping_address->>'postal_code') ~ '^\d{4}$'
  END
);

-- ═══════════════════════════════════════════════
-- STEP 7: Update auto-profile trigger
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  raw_name TEXT;
  space_pos INTEGER;
BEGIN
  raw_name := trim(COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  space_pos := position(' ' IN raw_name);

  INSERT INTO public.user_profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    CASE WHEN char_length(raw_name) > 0 THEN
      CASE WHEN space_pos > 0 THEN left(raw_name, space_pos - 1) ELSE raw_name END
    ELSE '-' END,
    CASE WHEN space_pos > 0 THEN substring(raw_name FROM space_pos + 1) ELSE '-' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
