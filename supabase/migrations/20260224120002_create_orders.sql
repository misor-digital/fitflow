-- ============================================================================
-- Orders Table
-- ============================================================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL DEFAULT generate_order_id(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_full_name TEXT NOT NULL,
  customer_phone TEXT,
  shipping_address JSONB NOT NULL,
  address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
  box_type TEXT NOT NULL,
  wants_personalization BOOLEAN NOT NULL DEFAULT false,
  sports TEXT[],
  sport_other TEXT,
  colors TEXT[],
  flavors TEXT[],
  flavor_other TEXT,
  dietary TEXT[],
  dietary_other TEXT,
  size_upper TEXT,
  size_lower TEXT,
  additional_notes TEXT,
  promo_code TEXT,
  discount_percent NUMERIC(5,2),
  original_price_eur NUMERIC(10,2),
  final_price_eur NUMERIC(10,2),
  status order_status NOT NULL DEFAULT 'pending',
  converted_from_preorder_id UUID UNIQUE REFERENCES preorders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_shipping_address CHECK (
    shipping_address ? 'city'
    AND shipping_address ? 'postal_code'
    AND shipping_address ? 'street_address'
    AND shipping_address ? 'full_name'
    AND (shipping_address->>'postal_code') ~ '^\d{4}$'
  )
);

-- Indexes
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_converted_from ON orders(converted_from_preorder_id) WHERE converted_from_preorder_id IS NOT NULL;

-- Reuse existing updated_at trigger
CREATE TRIGGER trigger_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY orders_select_own ON orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY orders_service_role ON orders
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Grants
-- ============================================================================

GRANT SELECT ON orders TO authenticated;
GRANT ALL ON orders TO service_role;

-- ============================================================================
-- Table Comments
-- ============================================================================

COMMENT ON TABLE orders IS 'Customer orders for FitFlow subscription boxes';
COMMENT ON COLUMN orders.shipping_address IS 'Frozen address snapshot at order time — immutable source of truth';
COMMENT ON COLUMN orders.address_id IS 'Optional back-reference to saved address — SET NULL on delete';
COMMENT ON COLUMN orders.customer_email IS 'Customer email frozen at order time — used for guest tracking';
COMMENT ON COLUMN orders.converted_from_preorder_id IS 'Links to the preorder this order was converted from (if any)';
