BEGIN;

-- 1. Add delivery_method column
ALTER TABLE orders
  ADD COLUMN delivery_method TEXT NOT NULL DEFAULT 'address';

ALTER TABLE orders
  ADD CONSTRAINT valid_delivery_method CHECK (
    delivery_method IN ('address', 'speedy_office')
  );

COMMENT ON COLUMN orders.delivery_method IS 'Delivery method: address (to door) or speedy_office (Speedy office pickup)';

-- 2. Replace shipping_address constraint with delivery-method-aware version
ALTER TABLE orders DROP CONSTRAINT valid_shipping_address;

ALTER TABLE orders ADD CONSTRAINT valid_shipping_address CHECK (
  CASE
    WHEN delivery_method = 'speedy_office' THEN
      shipping_address ? 'full_name'
      AND shipping_address ? 'phone'
      AND (shipping_address->>'phone') IS NOT NULL
      AND length(shipping_address->>'phone') > 0
      AND shipping_address ? 'speedy_office_id'
      AND shipping_address ? 'speedy_office_name'
    ELSE
      shipping_address ? 'city'
      AND shipping_address ? 'postal_code'
      AND shipping_address ? 'street_address'
      AND shipping_address ? 'full_name'
      AND (shipping_address->>'postal_code') ~ '^\d{4}$'
  END
);

-- 3. Add index on delivery_method
CREATE INDEX IF NOT EXISTS idx_orders_delivery_method ON orders(delivery_method);

COMMIT;
