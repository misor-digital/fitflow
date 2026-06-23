-- ============================================================================
-- Add personalization edit token to orders
-- Migration: 20260623120000_add_order_personalization_token
--
-- Mirrors the subscription_conversion_token pattern. Lets a customer complete
-- box personalization (sports/colors/flavors/notes) from the thank-you page
-- right after checkout — including guest orders that have no session.
--
-- The token is short-lived and single-use: it is cleared once the
-- personalization is saved.
-- ============================================================================

ALTER TABLE orders
  ADD COLUMN personalization_token UUID UNIQUE,
  ADD COLUMN personalization_token_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN orders.personalization_token
  IS 'One-time token authorizing post-checkout personalization from the thank-you page (guest-safe). Cleared after use.';
COMMENT ON COLUMN orders.personalization_token_expires_at
  IS 'Token expiry (short-lived; set at order creation).';

-- Partial index for fast token lookups
CREATE INDEX idx_orders_personalization_token
  ON orders (personalization_token)
  WHERE personalization_token IS NOT NULL;
