-- ============================================================================
-- Add 'speedy_automat' Delivery Method
--
-- Extends delivery_method CHECK constraints on orders and addresses tables
-- to support locker/automat delivery as a distinct method from office delivery.
-- Automat deliveries have the same data requirements as office deliveries.
-- ============================================================================

-- 1. Orders table: update valid_delivery_method constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS valid_delivery_method;
ALTER TABLE orders ADD CONSTRAINT valid_delivery_method CHECK (
  delivery_method IN ('address', 'speedy_office', 'speedy_automat')
);

-- 2. Orders table: update valid_shipping_address constraint
--    Automat uses the same shape as office (speedy_office_id, speedy_office_name, phone)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS valid_shipping_address;
ALTER TABLE orders ADD CONSTRAINT valid_shipping_address CHECK (
  CASE
    WHEN delivery_method IN ('speedy_office', 'speedy_automat') THEN
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

-- 3. Addresses table: update valid_delivery_method constraint
ALTER TABLE addresses DROP CONSTRAINT IF EXISTS valid_delivery_method;
ALTER TABLE addresses ADD CONSTRAINT valid_delivery_method CHECK (
  delivery_method IN ('address', 'speedy_office', 'speedy_automat')
);

-- 4. Addresses table: update valid_address_fields constraint
--    Automat uses the same shape as office (needs speedy_office_id + speedy_office_name)
ALTER TABLE addresses DROP CONSTRAINT IF EXISTS valid_address_fields;
ALTER TABLE addresses ADD CONSTRAINT valid_address_fields CHECK (
  CASE
    WHEN delivery_method IN ('speedy_office', 'speedy_automat') THEN
      speedy_office_id IS NOT NULL
      AND speedy_office_name IS NOT NULL
    ELSE
      city IS NOT NULL AND city <> ''
      AND postal_code IS NOT NULL AND postal_code ~ '^\d{4}$'
      AND street_address IS NOT NULL AND street_address <> ''
  END
);
