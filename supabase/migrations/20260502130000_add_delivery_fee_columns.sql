-- ============================================================================
-- Add Delivery Fee Columns & Pricing Table
--
-- Adds explicit delivery fee tracking to orders and creates a configurable
-- pricing table for delivery methods.
-- ============================================================================

-- 1. Add delivery fee columns to orders
ALTER TABLE orders
  ADD COLUMN delivery_fee_eur NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN delivery_fee_actual_eur NUMERIC(6,2);

COMMENT ON COLUMN orders.delivery_fee_eur IS 'Fixed delivery fee charged to customer (EUR)';
COMMENT ON COLUMN orders.delivery_fee_actual_eur IS 'Actual courier cost from Speedy API (filled at waybill creation)';

-- 2. Create delivery pricing configuration table
CREATE TABLE delivery_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_method TEXT NOT NULL UNIQUE CHECK (delivery_method IN ('address', 'speedy_office', 'speedy_automat')),
  price_eur NUMERIC(6,2) NOT NULL,
  label_bg TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE delivery_pricing IS 'Configurable fixed delivery pricing per method';

-- 3. Seed default prices
INSERT INTO delivery_pricing (delivery_method, price_eur, label_bg) VALUES
  ('address', 7.00, 'Доставка до адрес'),
  ('speedy_office', 5.00, 'До офис на Speedy'),
  ('speedy_automat', 4.00, 'До автомат на Speedy');

-- 4. RLS: allow public read, restrict writes to service role
ALTER TABLE delivery_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY delivery_pricing_read ON delivery_pricing
  FOR SELECT USING (true);

CREATE POLICY delivery_pricing_service_write ON delivery_pricing
  FOR ALL USING (auth.role() = 'service_role');
