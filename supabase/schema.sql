-- ============================================================================
-- FitFlow — Complete Database Schema (as of 2026-02-24, Phase E1)
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

CREATE TYPE subscription_status AS ENUM ('active', 'paused', 'cancelled', 'expired');
COMMENT ON TYPE subscription_status IS 'Lifecycle states for a subscription: active (receiving boxes), paused (temporarily stopped), cancelled (permanently stopped), expired (ran out / admin terminated)';

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

CREATE TYPE email_campaign_type AS ENUM (
  'one-off',
  'preorder-conversion',
  'promotional',
  'lifecycle'
);
COMMENT ON TYPE email_campaign_type IS 'Types of email campaigns: one-off (manual), preorder-conversion (token-based), promotional (marketing), lifecycle (event-triggered)';

CREATE TYPE email_campaign_status AS ENUM (
  'draft',
  'scheduled',
  'sending',
  'sent',
  'paused',
  'cancelled',
  'failed'
);
COMMENT ON TYPE email_campaign_status IS 'Lifecycle states for an email campaign';

CREATE TYPE email_recipient_status AS ENUM (
  'pending',
  'sent',
  'delivered',
  'opened',
  'clicked',
  'bounced',
  'failed',
  'skipped'
);
COMMENT ON TYPE email_recipient_status IS 'Delivery status for individual campaign recipients, updated via Brevo webhooks';

CREATE TYPE email_log_status AS ENUM (
  'sent',
  'delivered',
  'opened',
  'clicked',
  'bounced',
  'failed'
);
COMMENT ON TYPE email_log_status IS 'Status for all email sends — both transactional and campaign';

CREATE TYPE target_list_type AS ENUM (
  'preorder-holders',
  'subscribers',
  'all-customers',
  'custom-list'
);
COMMENT ON TYPE target_list_type IS 'Audience targeting categories for email campaigns';


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

  -- GDPR email consent (added by 20260224120023)
  email_consent BOOLEAN NOT NULL DEFAULT false,
  email_consent_at TIMESTAMPTZ,

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
COMMENT ON COLUMN preorders.email_consent IS 'Whether the preorder holder has consented to receiving marketing emails (GDPR)';
COMMENT ON COLUMN preorders.email_consent_at IS 'Timestamp when email consent was granted';

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
  max_uses_per_user INTEGER DEFAULT NULL,
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
COMMENT ON COLUMN promo_codes.max_uses_per_user IS 'Maximum times each user can use this code (NULL = unlimited)';

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


-- ---------- promo_code_usages ----------

CREATE TABLE promo_code_usages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent same order from being counted twice
CREATE UNIQUE INDEX idx_promo_code_usages_order
  ON promo_code_usages(promo_code_id, order_id)
  WHERE order_id IS NOT NULL;

-- Fast per-user usage count lookups
CREATE INDEX idx_promo_code_usages_user
  ON promo_code_usages(promo_code_id, user_id);

COMMENT ON TABLE promo_code_usages IS 'Audit trail of individual promo code redemptions per user';

ALTER TABLE promo_code_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access promo_code_usages"
  ON promo_code_usages FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT ALL ON promo_code_usages TO service_role;


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
  delivery_method TEXT NOT NULL DEFAULT 'address',
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
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  converted_from_preorder_id UUID UNIQUE REFERENCES preorders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_order_type CHECK (
    order_type IN ('subscription', 'onetime-mystery', 'onetime-revealed', 'direct')
  ),

  CONSTRAINT valid_delivery_method CHECK (
    delivery_method IN ('address', 'speedy_office')
  ),

  CONSTRAINT valid_shipping_address CHECK (
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
  )
);

COMMENT ON TABLE orders IS 'Customer orders for FitFlow subscription boxes';
COMMENT ON COLUMN orders.shipping_address IS 'Frozen address snapshot at order time — immutable source of truth';
COMMENT ON COLUMN orders.address_id IS 'Optional back-reference to saved address — SET NULL on delete';
COMMENT ON COLUMN orders.delivery_method IS 'Delivery method: address (to door) or speedy_office (Speedy office pickup)';
COMMENT ON COLUMN orders.customer_email IS 'Customer email frozen at order time — used for guest tracking';
COMMENT ON COLUMN orders.delivery_cycle_id IS 'FK to delivery cycle — set for subscription-generated, mystery, and revealed orders';
COMMENT ON COLUMN orders.order_type IS 'Order origin: subscription (auto-generated), onetime-mystery (ships with cycle batch), onetime-revealed (ships ASAP, past cycle contents), direct (legacy/standard)';
COMMENT ON COLUMN orders.subscription_id IS 'FK to parent subscription — set for auto-generated subscription cycle orders';
COMMENT ON COLUMN orders.converted_from_preorder_id IS 'Links to the preorder this order was converted from (if any)';

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_converted_from ON orders(converted_from_preorder_id) WHERE converted_from_preorder_id IS NOT NULL;
CREATE INDEX idx_orders_delivery_cycle ON orders(delivery_cycle_id) WHERE delivery_cycle_id IS NOT NULL;
CREATE INDEX idx_orders_order_type ON orders(order_type);
CREATE INDEX idx_orders_delivery_method ON orders(delivery_method);
CREATE INDEX idx_orders_subscription ON orders(subscription_id) WHERE subscription_id IS NOT NULL;

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


-- ---------- subscriptions ----------

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  box_type TEXT NOT NULL,
  status subscription_status NOT NULL DEFAULT 'active',
  frequency TEXT NOT NULL DEFAULT 'monthly',

  -- Personalization preferences (stored independently — updates affect future orders only)
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

  -- Pricing
  promo_code TEXT,
  discount_percent NUMERIC(5,2),
  base_price_eur NUMERIC(10,2) NOT NULL,
  current_price_eur NUMERIC(10,2) NOT NULL,

  -- Address
  default_address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,

  -- Cycle tracking
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_cycle_id UUID REFERENCES delivery_cycles(id) ON DELETE SET NULL,
  last_delivered_cycle_id UUID REFERENCES delivery_cycles(id) ON DELETE SET NULL,

  -- Lifecycle timestamps
  paused_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_frequency CHECK (frequency IN ('monthly', 'seasonal')),
  CONSTRAINT valid_sub_box_type CHECK (box_type IN ('monthly-standard', 'monthly-premium'))
);

COMMENT ON TABLE subscriptions IS 'Active and historical subscriptions — one row per subscriber per box type';
COMMENT ON COLUMN subscriptions.user_id IS 'FK to auth.users — subscriptions require authentication';
COMMENT ON COLUMN subscriptions.box_type IS 'monthly-standard or monthly-premium';
COMMENT ON COLUMN subscriptions.status IS 'Lifecycle state: active, paused, cancelled, expired';
COMMENT ON COLUMN subscriptions.frequency IS 'Delivery frequency: monthly (every cycle) or seasonal (every 3rd cycle)';
COMMENT ON COLUMN subscriptions.wants_personalization IS 'Whether subscriber opted for personalized boxes';
COMMENT ON COLUMN subscriptions.base_price_eur IS 'Original price per cycle in EUR';
COMMENT ON COLUMN subscriptions.current_price_eur IS 'Current price per cycle in EUR (after any discounts)';
COMMENT ON COLUMN subscriptions.default_address_id IS 'Default shipping address for auto-generated orders';
COMMENT ON COLUMN subscriptions.first_cycle_id IS 'The first delivery cycle this subscription participates in';
COMMENT ON COLUMN subscriptions.last_delivered_cycle_id IS 'Most recent cycle with an order generated for this subscription';
COMMENT ON COLUMN subscriptions.paused_at IS 'Timestamp when subscription was paused';
COMMENT ON COLUMN subscriptions.cancelled_at IS 'Timestamp when subscription was cancelled';
COMMENT ON COLUMN subscriptions.cancellation_reason IS 'Optional reason for cancellation';

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_active ON subscriptions(status) WHERE status = 'active';
CREATE INDEX idx_subscriptions_first_cycle ON subscriptions(first_cycle_id) WHERE first_cycle_id IS NOT NULL;

CREATE TRIGGER trigger_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_own" ON subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "subscriptions_update_own" ON subscriptions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND status = (SELECT status FROM subscriptions WHERE id = subscriptions.id)
  );

CREATE POLICY "staff_read_subscriptions" ON subscriptions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
      AND up.staff_role IN ('super_admin', 'admin', 'manager', 'support', 'warehouse')
    )
  );

CREATE POLICY "subscriptions_service_role" ON subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, UPDATE ON subscriptions TO authenticated;
GRANT ALL ON subscriptions TO service_role;


-- ---------- subscription_history ----------

CREATE TABLE subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE subscription_history IS 'Audit trail for subscription lifecycle events';
COMMENT ON COLUMN subscription_history.subscription_id IS 'FK to parent subscription — cascade deletes history when subscription is removed';
COMMENT ON COLUMN subscription_history.action IS 'Event type: created, paused, resumed, cancelled, expired, preferences_updated, address_changed, frequency_changed, order_generated';
COMMENT ON COLUMN subscription_history.details IS 'JSONB payload with before/after snapshots or contextual data';
COMMENT ON COLUMN subscription_history.performed_by IS 'FK to auth.users — the user or admin who triggered the action';

CREATE INDEX idx_sub_history_sub ON subscription_history(subscription_id, created_at DESC);

ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_history_select_own" ON subscription_history
  FOR SELECT TO authenticated
  USING (
    subscription_id IN (
      SELECT id FROM subscriptions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "sub_history_staff_read" ON subscription_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
      AND up.staff_role IN ('super_admin', 'admin', 'manager', 'support', 'warehouse')
    )
  );

CREATE POLICY "sub_history_service_role" ON subscription_history
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT ON subscription_history TO authenticated;
GRANT ALL ON subscription_history TO service_role;


-- ---------- email_campaigns ----------

CREATE TABLE email_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  subject         TEXT NOT NULL,
  template_id     INTEGER,
  html_content    TEXT,
  campaign_type   email_campaign_type NOT NULL,
  status          email_campaign_status NOT NULL DEFAULT 'draft',
  target_list_type target_list_type NOT NULL,
  target_filter   JSONB DEFAULT '{}'::jsonb,
  params          JSONB DEFAULT '{}'::jsonb,
  scheduled_at    TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count      INTEGER NOT NULL DEFAULT 0,
  failed_count    INTEGER NOT NULL DEFAULT 0,
  brevo_campaign_id TEXT,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  updated_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT email_campaigns_content_check CHECK (
    (template_id IS NOT NULL AND html_content IS NULL) OR
    (template_id IS NULL AND html_content IS NOT NULL) OR
    (template_id IS NULL AND html_content IS NULL)
  )
);

COMMENT ON TABLE email_campaigns IS 'Email campaign definitions with targeting, scheduling, and progress tracking';
COMMENT ON COLUMN email_campaigns.template_id IS 'Brevo template ID — used for Brevo-managed campaign emails';
COMMENT ON COLUMN email_campaigns.html_content IS 'Inline HTML content — used for code-managed campaign emails';
COMMENT ON COLUMN email_campaigns.target_filter IS 'JSONB filter criteria applied to the target audience (e.g. conversion_status, box_type)';
COMMENT ON COLUMN email_campaigns.params IS 'Global template variables passed to every recipient';
COMMENT ON COLUMN email_campaigns.brevo_campaign_id IS 'Brevo platform campaign ID when using their Campaign API for sending';

CREATE INDEX idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX idx_email_campaigns_type ON email_campaigns(campaign_type);
CREATE INDEX idx_email_campaigns_scheduled ON email_campaigns(scheduled_at)
  WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;
CREATE INDEX idx_email_campaigns_created_by ON email_campaigns(created_by);

CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON email_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_campaigns_staff_read" ON email_campaigns
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
    )
  );

CREATE POLICY "email_campaigns_staff_insert" ON email_campaigns
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
      AND up.staff_role IN ('super_admin', 'admin', 'marketing')
    )
  );

CREATE POLICY "email_campaigns_staff_update" ON email_campaigns
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
      AND up.staff_role IN ('super_admin', 'admin', 'marketing')
    )
  );

CREATE POLICY "email_campaigns_service_role" ON email_campaigns
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT SELECT ON email_campaigns TO authenticated;
GRANT ALL ON email_campaigns TO service_role;


-- ---------- email_campaign_recipients ----------

CREATE TABLE email_campaign_recipients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT,
  preorder_id     UUID REFERENCES preorders(id) ON DELETE SET NULL,
  variant_id      UUID REFERENCES email_ab_variants(id) ON DELETE SET NULL,
  params          JSONB DEFAULT '{}'::jsonb,
  status          email_recipient_status NOT NULL DEFAULT 'pending',
  brevo_message_id TEXT,
  sent_at         TIMESTAMPTZ,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT email_campaign_recipients_unique_email UNIQUE (campaign_id, email)
);

COMMENT ON TABLE email_campaign_recipients IS 'Individual recipients for each campaign with per-recipient params and delivery status';
COMMENT ON COLUMN email_campaign_recipients.params IS 'Per-recipient template variables (e.g. conversion URL with token)';
COMMENT ON COLUMN email_campaign_recipients.brevo_message_id IS 'Brevo message ID — used to correlate webhook events';

CREATE INDEX idx_ecr_campaign_pending ON email_campaign_recipients(campaign_id)
  WHERE status = 'pending';
CREATE INDEX idx_ecr_campaign_status ON email_campaign_recipients(campaign_id, status);
CREATE INDEX idx_ecr_brevo_message ON email_campaign_recipients(brevo_message_id)
  WHERE brevo_message_id IS NOT NULL;

CREATE TRIGGER update_email_campaign_recipients_updated_at
  BEFORE UPDATE ON email_campaign_recipients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE email_campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecr_staff_read" ON email_campaign_recipients
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
    )
  );

CREATE POLICY "ecr_service_role" ON email_campaign_recipients
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT SELECT ON email_campaign_recipients TO authenticated;
GRANT ALL ON email_campaign_recipients TO service_role;


-- ---------- email_campaign_history ----------

CREATE TABLE email_campaign_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  action          TEXT NOT NULL,
  changed_by      UUID NOT NULL REFERENCES auth.users(id),
  notes           TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE email_campaign_history IS 'Audit trail for email campaign lifecycle — every state change is logged with the staff member who performed it';
COMMENT ON COLUMN email_campaign_history.action IS 'Campaign action: created, updated, scheduled, started, paused, resumed, cancelled, completed, failed';
COMMENT ON COLUMN email_campaign_history.changed_by IS 'Staff member UUID who performed this action';
COMMENT ON COLUMN email_campaign_history.metadata IS 'Action-specific metadata (e.g. {recipientCount, filter, previousStatus, errorDetail})';

CREATE INDEX idx_ech_campaign ON email_campaign_history(campaign_id, created_at DESC);

ALTER TABLE email_campaign_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ech_staff_read" ON email_campaign_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
    )
  );

CREATE POLICY "ech_service_role" ON email_campaign_history
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT SELECT ON email_campaign_history TO authenticated;
GRANT ALL ON email_campaign_history TO service_role;


-- ---------- email_send_log ----------

CREATE TABLE email_send_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type          TEXT NOT NULL CHECK (email_type IN ('transactional', 'campaign')),
  email_category      TEXT NOT NULL,
  recipient_email     TEXT NOT NULL,
  recipient_name      TEXT,
  subject             TEXT,
  template_id         INTEGER,
  brevo_message_id    TEXT,
  campaign_id         UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
  status              email_log_status NOT NULL DEFAULT 'sent',
  params              JSONB,
  error               TEXT,
  related_entity_type TEXT,
  related_entity_id   UUID,
  delivered_at        TIMESTAMPTZ,
  opened_at           TIMESTAMPTZ,
  clicked_at          TIMESTAMPTZ,
  unsubscribed_at     TIMESTAMPTZ,
  webhook_events      JSONB DEFAULT '[]'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE email_send_log IS 'Unified audit log for all email sends (transactional + campaign) — used by admin email dashboard';
COMMENT ON COLUMN email_send_log.email_category IS 'Descriptive category: order-confirmation, sub-created, sub-paused, preorder-conversion, cron-success, etc.';
COMMENT ON COLUMN email_send_log.related_entity_type IS 'Type of the related business entity (order, subscription, preorder)';
COMMENT ON COLUMN email_send_log.related_entity_id IS 'UUID of the related business entity';

CREATE INDEX idx_esl_recipient ON email_send_log(recipient_email, created_at DESC);
CREATE INDEX idx_esl_category ON email_send_log(email_category, created_at DESC);
CREATE INDEX idx_esl_campaign ON email_send_log(campaign_id)
  WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_esl_brevo_message ON email_send_log(brevo_message_id)
  WHERE brevo_message_id IS NOT NULL;
CREATE INDEX idx_esl_related ON email_send_log(related_entity_type, related_entity_id)
  WHERE related_entity_type IS NOT NULL;
CREATE INDEX idx_esl_created ON email_send_log(created_at DESC);

ALTER TABLE email_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "esl_staff_read" ON email_send_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
    )
  );

CREATE POLICY "esl_service_role" ON email_send_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT SELECT ON email_send_log TO authenticated;
GRANT ALL ON email_send_log TO service_role;


-- ---------- email_monthly_usage ----------

CREATE TABLE email_monthly_usage (
  month               DATE PRIMARY KEY,
  transactional_sent  INTEGER NOT NULL DEFAULT 0,
  campaign_sent       INTEGER NOT NULL DEFAULT 0,
  total_sent          INTEGER GENERATED ALWAYS AS (transactional_sent + campaign_sent) STORED,
  monthly_limit       INTEGER NOT NULL DEFAULT 5000,
  alert_sent_80       BOOLEAN NOT NULL DEFAULT false,
  alert_sent_95       BOOLEAN NOT NULL DEFAULT false
);

COMMENT ON TABLE email_monthly_usage IS 'Monthly email send volume tracking against Brevo plan limits';
COMMENT ON COLUMN email_monthly_usage.month IS 'First day of the month this row tracks (e.g. 2026-03-01)';
COMMENT ON COLUMN email_monthly_usage.monthly_limit IS 'Email send limit from Brevo plan — Starter: 5000, adjustable on upgrade';

ALTER TABLE email_monthly_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "emu_staff_read" ON email_monthly_usage
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
    )
  );

CREATE POLICY "emu_service_role" ON email_monthly_usage
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT SELECT ON email_monthly_usage TO authenticated;
GRANT ALL ON email_monthly_usage TO service_role;


-- ---------- email_ab_variants ----------

CREATE TABLE email_ab_variants (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id          UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  variant_label        TEXT NOT NULL DEFAULT 'A',
  subject              TEXT,
  template_id          INTEGER,
  params               JSONB DEFAULT '{}'::jsonb,
  recipient_percentage INTEGER NOT NULL DEFAULT 50,
  sent_count           INTEGER NOT NULL DEFAULT 0,
  delivered_count      INTEGER NOT NULL DEFAULT 0,
  opened_count         INTEGER NOT NULL DEFAULT 0,
  clicked_count        INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE email_ab_variants IS 'A/B test variants for email campaigns — each variant can override subject, template, or params';

ALTER TABLE email_ab_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eav_service_role" ON email_ab_variants
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT SELECT ON email_ab_variants TO authenticated;
GRANT ALL ON email_ab_variants TO service_role;


-- ---------- email_unsubscribes ----------

CREATE TABLE email_unsubscribes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT NOT NULL UNIQUE,
  source           TEXT NOT NULL DEFAULT 'brevo',
  campaign_id      UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
  reason           TEXT,
  unsubscribed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE email_unsubscribes IS 'Global unsubscribe list — recipients who opted out of marketing emails';

CREATE INDEX idx_email_unsubscribes_email ON email_unsubscribes(email);

ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eu_service_role" ON email_unsubscribes
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT SELECT ON email_unsubscribes TO authenticated;
GRANT ALL ON email_unsubscribes TO service_role;


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


-- Atomic promo code usage increment (with optional per-user tracking)
CREATE OR REPLACE FUNCTION increment_promo_usage(
  p_code TEXT,
  p_user_id UUID DEFAULT NULL,
  p_order_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_promo_id UUID;
BEGIN
  -- Atomically increment the global counter
  UPDATE promo_codes
  SET current_uses = current_uses + 1
  WHERE UPPER(code) = UPPER(p_code)
  RETURNING id INTO v_promo_id;

  -- Record per-user usage if user_id is provided
  IF v_promo_id IS NOT NULL AND p_user_id IS NOT NULL THEN
    INSERT INTO promo_code_usages (promo_code_id, user_id, order_id)
    VALUES (v_promo_id, p_user_id, p_order_id)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Check how many times a user has used a specific promo code
CREATE OR REPLACE FUNCTION check_user_promo_usage(
  p_code TEXT,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM promo_code_usages pcu
  JOIN promo_codes pc ON pc.id = pcu.promo_code_id
  WHERE UPPER(pc.code) = UPPER(p_code)
    AND pcu.user_id = p_user_id;

  RETURN COALESCE(v_count, 0);
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


-- Atomic increment for email usage tracking
CREATE OR REPLACE FUNCTION increment_email_usage(
  p_type TEXT,
  p_count INTEGER DEFAULT 1
) RETURNS TABLE (
  current_total INTEGER,
  current_limit INTEGER,
  is_over_limit BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_month DATE := date_trunc('month', CURRENT_DATE)::date;
  v_total INTEGER;
  v_limit INTEGER;
BEGIN
  INSERT INTO email_monthly_usage (month)
  VALUES (v_month)
  ON CONFLICT (month) DO NOTHING;

  IF p_type = 'transactional' THEN
    UPDATE email_monthly_usage
    SET transactional_sent = transactional_sent + p_count
    WHERE month = v_month;
  ELSIF p_type = 'campaign' THEN
    UPDATE email_monthly_usage
    SET campaign_sent = campaign_sent + p_count
    WHERE month = v_month;
  ELSE
    RAISE EXCEPTION 'Invalid email type: %. Must be transactional or campaign.', p_type;
  END IF;

  SELECT emu.total_sent, emu.monthly_limit, (emu.total_sent > emu.monthly_limit)
  INTO v_total, v_limit
  FROM email_monthly_usage emu
  WHERE emu.month = v_month;

  RETURN QUERY SELECT v_total, v_limit, (v_total > v_limit);
END;
$$;

COMMENT ON FUNCTION increment_email_usage IS 'Atomically increment email usage counter and return current state. Type must be transactional or campaign.';


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
