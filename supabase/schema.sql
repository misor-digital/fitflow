-- ============================================================================
-- FitFlow — Complete Database Schema (as of 2026-02-24)
-- ============================================================================
--
-- This file represents the complete database schema after all migrations.
-- DO NOT run directly — use migrations for all schema changes.
-- This is a documentation/reference file only.
--
-- Migrations are the source of truth for DB changes.
-- ============================================================================


-- ============================================================================
-- 1. Custom Enums
-- ============================================================================

CREATE TYPE box_type AS ENUM (
  'monthly-standard',
  'monthly-premium',
  'monthly-premium-monthly',
  'monthly-premium-seasonal',
  'onetime-standard',
  'onetime-premium'
);

CREATE TYPE user_type AS ENUM ('customer', 'staff');

CREATE TYPE staff_role AS ENUM (
  'super_admin',
  'admin',
  'manager',
  'warehouse',
  'marketing',
  'support',
  'finance',
  'content',
  'analyst'
);

CREATE TYPE order_status AS ENUM (
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
);
COMMENT ON TYPE order_status IS 'Lifecycle states for an order';

CREATE TYPE preorder_conversion_status AS ENUM ('pending', 'converted', 'expired');

CREATE TYPE delivery_cycle_status AS ENUM ('upcoming', 'delivered', 'archived');
COMMENT ON TYPE delivery_cycle_status IS 'Lifecycle states for a delivery cycle: upcoming (not yet shipped), delivered (shipped, may or may not be revealed), archived (past, no longer relevant)';

CREATE TYPE box_price_info AS (
  box_type_id TEXT,
  box_type_name TEXT,
  original_price_eur NUMERIC,
  original_price_bgn NUMERIC,
  discount_percent INTEGER,
  discount_amount_eur NUMERIC,
  discount_amount_bgn NUMERIC,
  final_price_eur NUMERIC,
  final_price_bgn NUMERIC
);


-- ============================================================================
-- 2. Shared Trigger Functions
-- ============================================================================

-- Auto-update updated_at column (used by multiple tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 3. Tables
-- ============================================================================

-- ---------- preorders ----------

CREATE TABLE preorders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT UNIQUE DEFAULT generate_order_id() NOT NULL,

  -- Contact Information
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,

  -- Box Selection
  box_type box_type NOT NULL,

  -- Personalization
  wants_personalization BOOLEAN NOT NULL DEFAULT false,
  sports TEXT[],
  sport_other TEXT,
  colors TEXT[],
  flavors TEXT[],
  flavor_other TEXT,
  size_upper TEXT,
  size_lower TEXT,
  dietary TEXT[],
  dietary_other TEXT,
  additional_notes TEXT,

  -- Promo / Pricing (added by add_promo_code_columns migration)
  promo_code TEXT,
  discount_percent NUMERIC(5,2),
  original_price_eur NUMERIC(10,2),
  final_price_eur NUMERIC(10,2),

  -- User link (added by 20260223120000)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Conversion tracking (added by 20260224120004)
  conversion_token UUID UNIQUE DEFAULT gen_random_uuid(),
  conversion_token_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
  conversion_status preorder_conversion_status NOT NULL DEFAULT 'pending',
  converted_to_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE preorders IS 'Stores FitFlow subscription box preorder information (legacy — new flow uses orders table)';
COMMENT ON COLUMN preorders.box_type IS 'Type of subscription box selected';
COMMENT ON COLUMN preorders.wants_personalization IS 'Whether user opted for personalized box';
COMMENT ON COLUMN preorders.sports IS 'Array of sports/activities selected for personalization';
COMMENT ON COLUMN preorders.colors IS 'Array of preferred colors';
COMMENT ON COLUMN preorders.flavors IS 'Array of preferred flavors for supplements';
COMMENT ON COLUMN preorders.promo_code IS 'Applied promo code (e.g., FITFLOW10, FITFLOW25)';
COMMENT ON COLUMN preorders.discount_percent IS 'Discount percentage applied (e.g., 10, 25)';
COMMENT ON COLUMN preorders.original_price_eur IS 'Original price in EUR before discount';
COMMENT ON COLUMN preorders.final_price_eur IS 'Final price in EUR after discount';
COMMENT ON COLUMN preorders.user_id IS 'FK to auth.users — NULL for anonymous preorders, set when user links their preorder';
COMMENT ON COLUMN preorders.conversion_token IS 'UUID token for the preorder-to-order conversion link';
COMMENT ON COLUMN preorders.conversion_token_expires_at IS 'Expiry timestamp for the conversion token (default: 90 days from creation)';
COMMENT ON COLUMN preorders.conversion_status IS 'Tracks whether this preorder has been converted to a full order';
COMMENT ON COLUMN preorders.converted_to_order_id IS 'FK to the order created from this preorder (if converted)';

-- Indexes
CREATE INDEX idx_preorders_email ON preorders(email);
CREATE INDEX idx_preorders_created_at ON preorders(created_at DESC);
CREATE INDEX idx_preorders_box_type ON preorders(box_type);
CREATE INDEX idx_preorders_order_id ON preorders(order_id);
CREATE INDEX idx_preorders_promo_code ON preorders(promo_code) WHERE promo_code IS NOT NULL;
CREATE INDEX idx_preorders_user_id ON preorders(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_preorders_conversion_token ON preorders(conversion_token) WHERE conversion_token IS NOT NULL;
CREATE INDEX idx_preorders_conversion_status ON preorders(conversion_status);

-- Triggers
CREATE TRIGGER update_preorders_updated_at
  BEFORE UPDATE ON preorders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE preorders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon inserts" ON preorders
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow service role full access" ON preorders
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users can read own preorders" ON preorders
  FOR SELECT TO authenticated USING (user_id = auth.uid());

GRANT INSERT ON preorders TO anon;
GRANT SELECT ON preorders TO authenticated;
GRANT ALL ON preorders TO service_role;


-- ---------- box_types ----------

CREATE TABLE box_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_eur NUMERIC(10,2) NOT NULL,
  is_subscription BOOLEAN NOT NULL DEFAULT false,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  frequency TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE box_types IS 'Subscription box types and pricing configuration';
COMMENT ON COLUMN box_types.id IS 'Unique identifier used in code (e.g., monthly-standard)';
COMMENT ON COLUMN box_types.name IS 'Display name in Bulgarian';
COMMENT ON COLUMN box_types.price_eur IS 'Price in EUR - source of truth for pricing';
COMMENT ON COLUMN box_types.is_subscription IS 'Whether this is a recurring subscription';
COMMENT ON COLUMN box_types.is_premium IS 'Whether this is a premium tier (includes clothing)';
COMMENT ON COLUMN box_types.frequency IS 'Delivery frequency: monthly, seasonal, or null for one-time';
COMMENT ON COLUMN box_types.is_enabled IS 'Soft delete flag - disabled types are hidden from customers';

CREATE INDEX idx_box_types_enabled ON box_types(is_enabled) WHERE is_enabled = true;
CREATE INDEX idx_box_types_sort ON box_types(sort_order);

CREATE TRIGGER update_box_types_updated_at
  BEFORE UPDATE ON box_types FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE box_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read box_types" ON box_types
  FOR SELECT TO anon USING (is_enabled = true);
CREATE POLICY "Allow authenticated read box_types" ON box_types
  FOR SELECT TO authenticated USING (is_enabled = true);
CREATE POLICY "Allow service role full access box_types" ON box_types
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT ON box_types TO anon;
GRANT SELECT ON box_types TO authenticated;
GRANT ALL ON box_types TO service_role;


-- ---------- promo_codes ----------

CREATE TABLE promo_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  discount_percent NUMERIC(5,2) NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  min_order_value_eur NUMERIC(10,2),
  applicable_box_types TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE promo_codes IS 'Promotional discount codes for checkout';
COMMENT ON COLUMN promo_codes.code IS 'The promo code string (case-insensitive)';
COMMENT ON COLUMN promo_codes.discount_percent IS 'Discount percentage (1-100)';
COMMENT ON COLUMN promo_codes.is_enabled IS 'Quick toggle to enable/disable code';
COMMENT ON COLUMN promo_codes.starts_at IS 'Optional: code becomes valid after this time';
COMMENT ON COLUMN promo_codes.ends_at IS 'Optional: code expires after this time';
COMMENT ON COLUMN promo_codes.max_uses IS 'Optional: maximum number of times code can be used';
COMMENT ON COLUMN promo_codes.current_uses IS 'Counter for how many times code has been used';
COMMENT ON COLUMN promo_codes.applicable_box_types IS 'Optional: array of box_type IDs this code applies to';

CREATE UNIQUE INDEX idx_promo_codes_code_unique ON promo_codes(UPPER(code));
CREATE INDEX idx_promo_codes_active ON promo_codes(is_enabled, starts_at, ends_at) WHERE is_enabled = true;

CREATE OR REPLACE FUNCTION update_promo_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_promo_codes_updated_at
  BEFORE UPDATE ON promo_codes FOR EACH ROW
  EXECUTE FUNCTION update_promo_codes_updated_at();

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access promo_codes" ON promo_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT ALL ON promo_codes TO service_role;


-- ---------- options ----------

CREATE TABLE options (
  id TEXT NOT NULL,
  option_set_id TEXT NOT NULL,
  label TEXT NOT NULL,
  value TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (option_set_id, id)
);

COMMENT ON TABLE options IS 'Configurable option sets for form selections (sports, colors, flavors, etc.)';
COMMENT ON COLUMN options.id IS 'Option value/key used in code';
COMMENT ON COLUMN options.option_set_id IS 'Group identifier (sports, colors, flavors, dietary, sizes)';
COMMENT ON COLUMN options.label IS 'Display label in Bulgarian';
COMMENT ON COLUMN options.value IS 'Optional additional value (e.g., hex color code)';
COMMENT ON COLUMN options.is_enabled IS 'Soft delete flag';

CREATE INDEX idx_options_set ON options(option_set_id, sort_order) WHERE is_enabled = true;

CREATE OR REPLACE FUNCTION update_options_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_options_updated_at
  BEFORE UPDATE ON options FOR EACH ROW
  EXECUTE FUNCTION update_options_updated_at();

ALTER TABLE options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read options" ON options
  FOR SELECT TO anon USING (is_enabled = true);
CREATE POLICY "Allow authenticated read options" ON options
  FOR SELECT TO authenticated USING (is_enabled = true);
CREATE POLICY "Allow service role full access options" ON options
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT ON options TO anon;
GRANT SELECT ON options TO authenticated;
GRANT ALL ON options TO service_role;


-- ---------- site_config ----------

CREATE TABLE site_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  value_type TEXT NOT NULL DEFAULT 'string',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE site_config IS 'Key-value store for site-wide configuration';
COMMENT ON COLUMN site_config.key IS 'Unique configuration key';
COMMENT ON COLUMN site_config.value IS 'Configuration value (stored as text)';
COMMENT ON COLUMN site_config.value_type IS 'Type hint for parsing: string, number, boolean, json';

CREATE OR REPLACE FUNCTION update_site_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_site_config_updated_at
  BEFORE UPDATE ON site_config FOR EACH ROW
  EXECUTE FUNCTION update_site_config_updated_at();

ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read site_config" ON site_config
  FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated read site_config" ON site_config
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow service role full access site_config" ON site_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT ON site_config TO anon;
GRANT SELECT ON site_config TO authenticated;
GRANT ALL ON site_config TO service_role;


-- ---------- user_profiles ----------

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  user_type user_type NOT NULL DEFAULT 'customer',
  staff_role staff_role,
  is_subscriber BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT staff_must_have_role CHECK (
    (user_type = 'staff' AND staff_role IS NOT NULL) OR
    (user_type = 'customer' AND staff_role IS NULL)
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_profiles IS 'Extended profile for auth.users — stores name, type, role, and subscriber flag';
COMMENT ON COLUMN user_profiles.user_type IS 'customer or staff';
COMMENT ON COLUMN user_profiles.staff_role IS 'Staff-only role. NULL for customers. Enforced by CHECK constraint.';
COMMENT ON COLUMN user_profiles.is_subscriber IS 'Whether the user is subscribed to marketing emails';

CREATE INDEX idx_user_profiles_user_type ON user_profiles(user_type);
CREATE INDEX idx_user_profiles_staff_role ON user_profiles(staff_role) WHERE staff_role IS NOT NULL;
CREATE INDEX idx_user_profiles_email ON user_profiles USING btree (id);

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND user_type = (SELECT user_type FROM user_profiles WHERE id = auth.uid())
    AND staff_role IS NOT DISTINCT FROM (SELECT staff_role FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Staff admins can read all profiles" ON user_profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
      AND up.staff_role IN ('super_admin', 'admin', 'manager')
    )
  );

CREATE POLICY "Super admin manages staff" ON user_profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
      AND up.staff_role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
      AND up.staff_role = 'super_admin'
    )
  );

CREATE POLICY "Service role full access on user_profiles" ON user_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ---------- rate_limits ----------

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON rate_limits
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ---------- delivery_cycles ----------

CREATE TABLE delivery_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_date DATE NOT NULL UNIQUE,
  status delivery_cycle_status NOT NULL DEFAULT 'upcoming',
  title TEXT,
  description TEXT,
  is_revealed BOOLEAN NOT NULL DEFAULT false,
  revealed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE delivery_cycles IS 'Monthly delivery cycles — each row represents one box shipment date';
COMMENT ON COLUMN delivery_cycles.delivery_date IS 'The date this cycle ships (e.g. 2026-03-08)';
COMMENT ON COLUMN delivery_cycles.status IS 'Lifecycle state: upcoming, delivered, archived';
COMMENT ON COLUMN delivery_cycles.title IS 'Display name (e.g. "Март 2026 кутия")';
COMMENT ON COLUMN delivery_cycles.description IS 'Rich text for the revealed-box public page';
COMMENT ON COLUMN delivery_cycles.is_revealed IS 'Whether box contents are publicly visible';
COMMENT ON COLUMN delivery_cycles.revealed_at IS 'When admin revealed the contents';

CREATE INDEX idx_delivery_cycles_upcoming ON delivery_cycles(delivery_date)
  WHERE status = 'upcoming';
CREATE INDEX idx_delivery_cycles_revealed ON delivery_cycles(delivery_date DESC)
  WHERE is_revealed = true;
CREATE INDEX idx_delivery_cycles_status ON delivery_cycles(status);

CREATE TRIGGER trigger_delivery_cycles_updated_at
  BEFORE UPDATE ON delivery_cycles FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE delivery_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery_cycles_anon_read" ON delivery_cycles
  FOR SELECT TO anon USING (true);
CREATE POLICY "delivery_cycles_auth_read" ON delivery_cycles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "delivery_cycles_service_role" ON delivery_cycles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT ON delivery_cycles TO anon;
GRANT SELECT ON delivery_cycles TO authenticated;
GRANT ALL ON delivery_cycles TO service_role;


-- ---------- delivery_cycle_items ----------

CREATE TABLE delivery_cycle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_cycle_id UUID NOT NULL REFERENCES delivery_cycles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  category TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE delivery_cycle_items IS 'Contents of each delivery cycle box — revealed publicly after delivery';
COMMENT ON COLUMN delivery_cycle_items.delivery_cycle_id IS 'FK to delivery_cycles — cascade deletes items when cycle is removed';
COMMENT ON COLUMN delivery_cycle_items.name IS 'Item display name (e.g. "Whey Protein 500g")';
COMMENT ON COLUMN delivery_cycle_items.description IS 'Item description';
COMMENT ON COLUMN delivery_cycle_items.image_url IS 'Path in Supabase Storage (e.g. box-contents/march-2026/protein.jpg)';
COMMENT ON COLUMN delivery_cycle_items.category IS 'Item category: protein, supplement, accessory, clothing, other';
COMMENT ON COLUMN delivery_cycle_items.sort_order IS 'Display order within the cycle';

CREATE INDEX idx_cycle_items_cycle ON delivery_cycle_items(delivery_cycle_id, sort_order);

CREATE TRIGGER trigger_delivery_cycle_items_updated_at
  BEFORE UPDATE ON delivery_cycle_items FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE delivery_cycle_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cycle_items_anon_read" ON delivery_cycle_items
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM delivery_cycles dc
      WHERE dc.id = delivery_cycle_items.delivery_cycle_id
      AND dc.is_revealed = true
    )
  );
CREATE POLICY "cycle_items_auth_read" ON delivery_cycle_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_cycles dc
      WHERE dc.id = delivery_cycle_items.delivery_cycle_id
      AND dc.is_revealed = true
    )
  );
CREATE POLICY "cycle_items_service_role" ON delivery_cycle_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT ON delivery_cycle_items TO anon;
GRANT SELECT ON delivery_cycle_items TO authenticated;
GRANT ALL ON delivery_cycle_items TO service_role;


-- ---------- addresses ----------

CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT,
  full_name TEXT NOT NULL,
  phone TEXT,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL CONSTRAINT valid_postal_code CHECK (postal_code ~ '^\d{4}$'),
  street_address TEXT NOT NULL,
  building_entrance TEXT,
  floor TEXT,
  apartment TEXT,
  delivery_notes TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_user_id_default ON addresses(user_id) WHERE is_default = true;

CREATE TRIGGER trigger_addresses_updated_at
  BEFORE UPDATE ON addresses FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY addresses_select_own ON addresses
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY addresses_insert_own ON addresses
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY addresses_update_own ON addresses
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY addresses_delete_own ON addresses
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY addresses_service_role ON addresses
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON addresses TO authenticated;
GRANT ALL ON addresses TO service_role;


-- ---------- orders ----------

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
  delivery_cycle_id UUID REFERENCES delivery_cycles(id) ON DELETE SET NULL,
  order_type TEXT NOT NULL DEFAULT 'direct',
  converted_from_preorder_id UUID UNIQUE REFERENCES preorders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_order_type CHECK (
    order_type IN ('subscription', 'onetime-mystery', 'onetime-revealed', 'direct')
  ),

  CONSTRAINT valid_shipping_address CHECK (
    shipping_address ? 'city'
    AND shipping_address ? 'postal_code'
    AND shipping_address ? 'street_address'
    AND shipping_address ? 'full_name'
    AND (shipping_address->>'postal_code') ~ '^\d{4}$'
  )
);

COMMENT ON TABLE orders IS 'Customer orders for FitFlow subscription boxes';
COMMENT ON COLUMN orders.shipping_address IS 'Frozen address snapshot at order time — immutable source of truth';
COMMENT ON COLUMN orders.address_id IS 'Optional back-reference to saved address — SET NULL on delete';
COMMENT ON COLUMN orders.customer_email IS 'Customer email frozen at order time — used for guest tracking';
COMMENT ON COLUMN orders.delivery_cycle_id IS 'FK to delivery cycle — set for subscription-generated, mystery, and revealed orders';
COMMENT ON COLUMN orders.order_type IS 'Order origin: subscription (auto-generated), onetime-mystery (ships with cycle batch), onetime-revealed (ships ASAP, past cycle contents), direct (legacy/standard)';
COMMENT ON COLUMN orders.converted_from_preorder_id IS 'Links to the preorder this order was converted from (if any)';

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_converted_from ON orders(converted_from_preorder_id) WHERE converted_from_preorder_id IS NOT NULL;
CREATE INDEX idx_orders_delivery_cycle ON orders(delivery_cycle_id) WHERE delivery_cycle_id IS NOT NULL;
CREATE INDEX idx_orders_order_type ON orders(order_type);

CREATE TRIGGER trigger_orders_updated_at
  BEFORE UPDATE ON orders FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY orders_select_own ON orders
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY orders_service_role ON orders
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT ON orders TO authenticated;
GRANT ALL ON orders TO service_role;


-- ---------- order_status_history ----------

CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status order_status,
  to_status order_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);

ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY history_select_own ON order_status_history
  FOR SELECT TO authenticated
  USING (order_id IN (SELECT id FROM orders WHERE user_id = auth.uid()));
CREATE POLICY history_service_role ON order_status_history
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT ON order_status_history TO authenticated;
GRANT ALL ON order_status_history TO service_role;

-- NOTE: Auto-insert trigger for status changes was removed in migration
-- 20260224120006_remove_auto_status_trigger.sql — status history is now
-- managed explicitly by the application DAL to support changed_by and notes.


-- ============================================================================
-- 4. RPC Functions
-- ============================================================================

-- Generate human-readable order ID: FF-{DDMMYY}-{RAND(6)}
CREATE OR REPLACE FUNCTION generate_order_id()
RETURNS TEXT AS $$
DECLARE
  date_part TEXT;
  random_part TEXT;
  new_order_id TEXT;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
BEGIN
  date_part := TO_CHAR(NOW(), 'DDMMYY');
  random_part := '';
  FOR i IN 1..6 LOOP
    random_part := random_part || SUBSTR(chars, FLOOR(RANDOM() * LENGTH(chars) + 1)::INT, 1);
  END LOOP;
  new_order_id := 'FF-' || date_part || '-' || random_part;
  RETURN new_order_id;
END;
$$ LANGUAGE plpgsql;


-- Calculate all box prices with optional promo code discount
CREATE OR REPLACE FUNCTION calculate_box_prices(p_promo_code TEXT DEFAULT NULL)
RETURNS SETOF box_price_info
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_discount_percent INTEGER := 0;
  v_eur_to_bgn_rate NUMERIC := 1.9558;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT CAST(value AS NUMERIC) INTO v_eur_to_bgn_rate
  FROM site_config WHERE key = 'EUR_TO_BGN_RATE';

  IF v_eur_to_bgn_rate IS NULL THEN
    v_eur_to_bgn_rate := 1.9558;
  END IF;

  IF p_promo_code IS NOT NULL AND p_promo_code != '' THEN
    SELECT discount_percent INTO v_discount_percent
    FROM promo_codes
    WHERE UPPER(code) = UPPER(p_promo_code)
      AND is_enabled = true
      AND (starts_at IS NULL OR starts_at <= v_now)
      AND (ends_at IS NULL OR ends_at > v_now)
      AND (max_uses IS NULL OR current_uses < max_uses);

    IF v_discount_percent IS NULL THEN
      v_discount_percent := 0;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    bt.id::TEXT,
    bt.name::TEXT,
    bt.price_eur::NUMERIC,
    ROUND(bt.price_eur * v_eur_to_bgn_rate, 2)::NUMERIC,
    v_discount_percent,
    ROUND((v_discount_percent::NUMERIC / 100) * bt.price_eur, 2)::NUMERIC,
    ROUND((v_discount_percent::NUMERIC / 100) * bt.price_eur * v_eur_to_bgn_rate, 2)::NUMERIC,
    ROUND(bt.price_eur * (1 - v_discount_percent::NUMERIC / 100), 2)::NUMERIC,
    ROUND(bt.price_eur * (1 - v_discount_percent::NUMERIC / 100) * v_eur_to_bgn_rate, 2)::NUMERIC
  FROM box_types bt
  WHERE bt.is_enabled = true
  ORDER BY bt.sort_order;
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_box_prices(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION calculate_box_prices(TEXT) TO authenticated;
COMMENT ON FUNCTION calculate_box_prices IS 'Calculates all box prices with optional promo code discount. Returns all enabled box types with original and final prices in EUR and BGN.';


-- Rate limiting function (sliding window)
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  INSERT INTO rate_limits (key, count, window_start)
  VALUES (p_key, 1, v_now)
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      WHEN rate_limits.window_start + (p_window_seconds || ' seconds')::INTERVAL < v_now
      THEN 1
      ELSE rate_limits.count + 1
    END,
    window_start = CASE
      WHEN rate_limits.window_start + (p_window_seconds || ' seconds')::INTERVAL < v_now
      THEN v_now
      ELSE rate_limits.window_start
    END
  RETURNING count INTO v_count;

  RETURN v_count <= p_max_requests;
END;
$$ LANGUAGE plpgsql;


-- Atomic promo code usage increment
CREATE OR REPLACE FUNCTION increment_promo_usage(p_code TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE promo_codes
  SET current_uses = current_uses + 1
  WHERE UPPER(code) = UPPER(p_code);
END;
$$ LANGUAGE plpgsql;


-- Enforce single default address per user
CREATE OR REPLACE FUNCTION enforce_single_default_address()
RETURNS TRIGGER AS $$
DECLARE
  address_count INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT COUNT(*) INTO address_count FROM addresses WHERE user_id = NEW.user_id;
  ELSE
    SELECT COUNT(*) INTO address_count FROM addresses WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;

  IF address_count = 0 THEN
    NEW.is_default := true;
    RETURN NEW;
  END IF;

  IF NEW.is_default = true THEN
    UPDATE addresses SET is_default = false WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_enforce_single_default_address
  BEFORE INSERT OR UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION enforce_single_default_address();


-- Promote another address to default when default is deleted
CREATE OR REPLACE FUNCTION ensure_default_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_default = true THEN
    UPDATE addresses SET is_default = true
    WHERE id = (
      SELECT id FROM addresses
      WHERE user_id = OLD.user_id
      ORDER BY created_at DESC LIMIT 1
    );
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_default_on_delete
  AFTER DELETE ON addresses
  FOR EACH ROW EXECUTE FUNCTION ensure_default_on_delete();


-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================================
-- 5. Seed Data (reference only — DO NOT run directly)
-- ============================================================================

-- Box types:
--   ('monthly-standard',         'Месечна - Стандартна',                    24.90, subscription, standard, monthly)
--   ('monthly-premium',          'Месечна - Премиум',                      34.90, subscription, premium,  monthly)
--   ('monthly-premium-monthly',  'Месечна - Премиум (всеки месец)',        34.90, subscription, premium,  monthly)
--   ('monthly-premium-seasonal', 'Месечна - Премиум (всеки 3 месеца)',     34.90, subscription, premium,  seasonal)
--   ('onetime-standard',         'Еднократна - Стандартна',                29.90, one-time,     standard)
--   ('onetime-premium',          'Еднократна - Премиум',                   39.90, one-time,     premium)

-- Promo codes:
--   FITFLOW10 — 10% discount
--   FITFLOW25 — 25% discount

-- Site config:
--   EUR_TO_BGN_RATE             = 1.9558
--   FREE_SHIPPING_THRESHOLD_EUR = 0
--   PREORDER_ENABLED            = false (deprecated)
--   ORDER_ENABLED               = true
--   SUBSCRIPTION_DELIVERY_DAY   = 5
--   FIRST_DELIVERY_DATE         = 2026-03-08
--   SUBSCRIPTION_ENABLED        = true
--   REVEALED_BOX_ENABLED        = false

-- Delivery cycles:
--   2026-03-08 — Март 2026 кутия (upcoming, first delivery)

-- Options: sports (7), colors (10), flavors (6), dietary (5), sizes (5)
-- See migration 20251228120002_create_options.sql for full seed data.
