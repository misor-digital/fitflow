-- ============================================================================
-- Add Speedy Office Delivery Support to Addresses Table
--
-- Allows storing Speedy office delivery preferences alongside regular addresses.
-- Relaxes NOT NULL constraints on city/postal_code/street_address for office
-- deliveries where those fields are not applicable.
-- ============================================================================

-- 1. Add delivery method and Speedy office columns
ALTER TABLE addresses
  ADD COLUMN delivery_method TEXT NOT NULL DEFAULT 'address',
  ADD COLUMN speedy_office_id TEXT,
  ADD COLUMN speedy_office_name TEXT,
  ADD COLUMN speedy_office_address TEXT;

-- 2. Drop the old postal_code CHECK constraint
ALTER TABLE addresses DROP CONSTRAINT valid_postal_code;

-- 3. Allow NULLs on city, postal_code, street_address (needed for office delivery)
ALTER TABLE addresses
  ALTER COLUMN city DROP NOT NULL,
  ALTER COLUMN postal_code DROP NOT NULL,
  ALTER COLUMN street_address DROP NOT NULL;

-- 4. Add conditional validation: regular addresses require city/postal/street,
--    Speedy office addresses require office_id and office_name
ALTER TABLE addresses ADD CONSTRAINT valid_address_fields CHECK (
  CASE
    WHEN delivery_method = 'speedy_office' THEN
      speedy_office_id IS NOT NULL
      AND speedy_office_name IS NOT NULL
    ELSE
      city IS NOT NULL AND city <> ''
      AND postal_code IS NOT NULL AND postal_code ~ '^\d{4}$'
      AND street_address IS NOT NULL AND street_address <> ''
  END
);

-- 5. Ensure delivery_method is a known value
ALTER TABLE addresses ADD CONSTRAINT valid_delivery_method
  CHECK (delivery_method IN ('address', 'speedy_office'));
