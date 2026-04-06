-- Migration: Add promo cycle tracking
-- Promo codes should be cycle-based: applied for N delivery cycles, then cleared.

-- 1. Add default_max_cycles to promo_codes (1 = first order only, NULL = unlimited)
ALTER TABLE promo_codes
  ADD COLUMN default_max_cycles INTEGER DEFAULT 1;

ALTER TABLE promo_codes
  ADD CONSTRAINT promo_codes_default_max_cycles_positive
  CHECK (default_max_cycles IS NULL OR default_max_cycles >= 1);

COMMENT ON COLUMN promo_codes.default_max_cycles IS 'Default number of subscription delivery cycles this promo applies to (1 = first order only, NULL = unlimited)';

-- 2. Add cycle tracking to subscriptions
ALTER TABLE subscriptions
  ADD COLUMN promo_max_cycles INTEGER DEFAULT 1,
  ADD COLUMN promo_cycles_used INTEGER NOT NULL DEFAULT 0;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_promo_max_cycles_positive
  CHECK (promo_max_cycles IS NULL OR promo_max_cycles >= 1);

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_promo_cycles_used_non_negative
  CHECK (promo_cycles_used >= 0);

COMMENT ON COLUMN subscriptions.promo_max_cycles IS 'Max delivery cycles this promo applies to (copied from promo_codes.default_max_cycles at creation, NULL = unlimited)';
COMMENT ON COLUMN subscriptions.promo_cycles_used IS 'Number of delivery cycles the promo has been applied to so far';

-- 3. Backfill existing data

-- 3a. Set promo_max_cycles = 1 for all existing subs with promos
UPDATE subscriptions
SET promo_max_cycles = 1
WHERE promo_code IS NOT NULL;

-- 3b. Set promo_cycles_used to actual order count with that promo
UPDATE subscriptions s
SET promo_cycles_used = sub_counts.order_count
FROM (
  SELECT o.subscription_id, COUNT(*)::INTEGER AS order_count
  FROM orders o
  WHERE o.subscription_id IS NOT NULL
    AND o.promo_code IS NOT NULL
  GROUP BY o.subscription_id
) sub_counts
WHERE s.id = sub_counts.subscription_id
  AND s.promo_code IS NOT NULL;

-- 3c. Clear promo on subs that have already used their allowed cycles
UPDATE subscriptions
SET
  promo_code = NULL,
  discount_percent = NULL,
  current_price_eur = base_price_eur
WHERE promo_code IS NOT NULL
  AND promo_max_cycles IS NOT NULL
  AND promo_cycles_used >= promo_max_cycles;
