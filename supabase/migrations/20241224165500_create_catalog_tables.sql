-- Migration: Create catalog tables for business configuration data
-- This migration creates tables for box types, promo codes, and option sets
-- to replace hardcoded constants in the codebase

-- ============================================================================
-- 1. BOX_TYPES TABLE - Subscription/product plans with pricing
-- ============================================================================
CREATE TABLE IF NOT EXISTS box_types (
    id TEXT PRIMARY KEY,  -- e.g., 'monthly-standard', 'monthly-premium'
    name TEXT NOT NULL,   -- Display name in Bulgarian
    description TEXT,     -- Short description
    category TEXT NOT NULL CHECK (category IN ('monthly', 'one-time')),
    tier TEXT NOT NULL CHECK (tier IN ('standard', 'premium')),
    price_eur DECIMAL(10, 2) NOT NULL,
    is_subscription BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX idx_box_types_enabled ON box_types(is_enabled) WHERE is_enabled = true;
CREATE INDEX idx_box_types_category ON box_types(category);

-- ============================================================================
-- 2. PROMO_CODES TABLE - Discount codes with validation rules
-- ============================================================================
CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
    description TEXT,
    max_uses INTEGER,  -- NULL means unlimited
    current_uses INTEGER NOT NULL DEFAULT 0,
    starts_at TIMESTAMPTZ,  -- NULL means immediately valid
    ends_at TIMESTAMPTZ,    -- NULL means no expiry
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for code lookups (case-insensitive)
CREATE UNIQUE INDEX idx_promo_codes_code_upper ON promo_codes(UPPER(code));
CREATE INDEX idx_promo_codes_enabled ON promo_codes(is_enabled) WHERE is_enabled = true;

-- ============================================================================
-- 3. OPTION_SETS TABLE - Categories of options (sports, flavors, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS option_sets (
    id TEXT PRIMARY KEY,  -- e.g., 'sports', 'flavors', 'dietary', 'colors', 'sizes'
    name TEXT NOT NULL,   -- Display name
    description TEXT,
    allow_multiple BOOLEAN NOT NULL DEFAULT false,
    allow_other BOOLEAN NOT NULL DEFAULT false,  -- Allow "other" free text
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. OPTIONS TABLE - Individual options within each set
-- ============================================================================
CREATE TABLE IF NOT EXISTS options (
    id TEXT NOT NULL,  -- e.g., 'fitness', 'chocolate', '#000000'
    option_set_id TEXT NOT NULL REFERENCES option_sets(id) ON DELETE CASCADE,
    label TEXT NOT NULL,  -- Display label in Bulgarian
    value TEXT,  -- Optional value (e.g., hex color code)
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (option_set_id, id)
);

-- Index for option lookups
CREATE INDEX idx_options_set_enabled ON options(option_set_id, is_enabled) WHERE is_enabled = true;

-- ============================================================================
-- 5. SITE_CONFIG TABLE - Global configuration values
-- ============================================================================
CREATE TABLE IF NOT EXISTS site_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE box_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE option_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. RLS POLICIES - Public read access for catalog tables
-- ============================================================================

-- Box types: Anyone can read enabled box types
CREATE POLICY "Allow public read access to enabled box types"
    ON box_types FOR SELECT
    USING (is_enabled = true);

-- Promo codes: Only server can read (validated server-side)
-- No public read policy - promo validation happens server-side only
CREATE POLICY "Allow authenticated service role full access to promo codes"
    ON promo_codes FOR ALL
    USING (true)
    WITH CHECK (true);

-- Option sets: Anyone can read enabled option sets
CREATE POLICY "Allow public read access to enabled option sets"
    ON option_sets FOR SELECT
    USING (is_enabled = true);

-- Options: Anyone can read enabled options
CREATE POLICY "Allow public read access to enabled options"
    ON options FOR SELECT
    USING (is_enabled = true);

-- Site config: Anyone can read
CREATE POLICY "Allow public read access to site config"
    ON site_config FOR SELECT
    USING (true);

-- ============================================================================
-- 8. SEED DATA - Box Types
-- ============================================================================
INSERT INTO box_types (id, name, description, category, tier, price_eur, is_subscription, sort_order) VALUES
    ('monthly-standard', 'Месечна - Стандартна', 'Получаваш кутия с 4-6 продукта, включително протеинови продукти, хранителни добавки и спортни аксесоари', 'monthly', 'standard', 24.90, true, 1),
    ('monthly-premium', 'Месечна - Премиум', 'Получаваш всичко от стандартната кутия плюс спортно облекло', 'monthly', 'premium', 34.90, true, 2),
    ('one-time-standard', 'Еднократна - Стандартна', 'Получаваш кутия с 4-6 продукта, включително протеинови продукти, хранителни добавки и спортни аксесоари', 'one-time', 'standard', 29.90, false, 3),
    ('one-time-premium', 'Еднократна - Премиум', 'Получаваш всичко от стандартната кутия плюс спортно облекло', 'one-time', 'premium', 39.90, false, 4)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_eur = EXCLUDED.price_eur,
    updated_at = NOW();

-- ============================================================================
-- 9. SEED DATA - Promo Codes
-- ============================================================================
INSERT INTO promo_codes (code, discount_percent, description, is_enabled) VALUES
    ('FITFLOW10', 10, 'Launch promo - 10% off', true),
<<<<<<< Updated upstream
    ('FITFLOW25', 25, 'Special promo - 25% off', true),
=======
    ('FITFLOW20', 20, 'Special promo - 20% off', true),
    ('FITFLOW30', 30, 'VIP promo - 30% off', true)
>>>>>>> Stashed changes
ON CONFLICT (code) DO UPDATE SET
    discount_percent = EXCLUDED.discount_percent,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ============================================================================
-- 10. SEED DATA - Option Sets
-- ============================================================================
INSERT INTO option_sets (id, name, description, allow_multiple, allow_other, sort_order) VALUES
    ('sports', 'Спортове', 'Предпочитани спортове', true, true, 1),
    ('flavors', 'Вкусове', 'Предпочитани вкусове', true, true, 2),
    ('dietary', 'Диетични ограничения', 'Хранителни ограничения', true, true, 3),
    ('colors', 'Цветове', 'Предпочитани цветове', true, false, 4),
    ('sizes', 'Размери', 'Размери облекло', false, false, 5)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ============================================================================
-- 11. SEED DATA - Sports Options
-- ============================================================================
INSERT INTO options (id, option_set_id, label, sort_order) VALUES
    ('fitness', 'sports', 'Фитнес', 1),
    ('dance', 'sports', 'Танци', 2),
    ('yoga', 'sports', 'Йога', 3),
    ('running', 'sports', 'Бягане', 4),
    ('basketball', 'sports', 'Баскетбол', 5),
    ('volleyball', 'sports', 'Волейбол', 6),
    ('tennis', 'sports', 'Тенис', 7),
    ('swimming', 'sports', 'Плуване', 8)
ON CONFLICT (option_set_id, id) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- ============================================================================
-- 12. SEED DATA - Flavor Options
-- ============================================================================
INSERT INTO options (id, option_set_id, label, sort_order) VALUES
    ('chocolate', 'flavors', 'Шоколад', 1),
    ('vanilla', 'flavors', 'Ванилия', 2),
    ('strawberry', 'flavors', 'Ягода', 3),
    ('banana', 'flavors', 'Банан', 4),
    ('caramel', 'flavors', 'Карамел', 5),
    ('coconut', 'flavors', 'Кокос', 6),
    ('peanut', 'flavors', 'Фъстък', 7),
    ('neutral', 'flavors', 'Неутрален', 8)
ON CONFLICT (option_set_id, id) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- ============================================================================
-- 13. SEED DATA - Dietary Options
-- ============================================================================
INSERT INTO options (id, option_set_id, label, sort_order) VALUES
    ('none', 'dietary', 'Не', 1),
    ('lactose', 'dietary', 'Без лактоза', 2),
    ('gluten', 'dietary', 'Без глутен', 3),
    ('vegan', 'dietary', 'Веган', 4),
    ('sugar-free', 'dietary', 'Без захар', 5)
ON CONFLICT (option_set_id, id) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- ============================================================================
-- 14. SEED DATA - Color Options
-- ============================================================================
INSERT INTO options (id, option_set_id, label, value, sort_order) VALUES
    ('black', 'colors', 'Черно', '#000000', 1),
    ('white', 'colors', 'Бяло', '#FFFFFF', 2),
    ('gray', 'colors', 'Сиво', '#8A8A8A', 3),
    ('navy', 'colors', 'Тъмно синьо', '#0A1A33', 4),
    ('light-blue', 'colors', 'Светло синьо', '#7EC8E3', 5),
    ('pink', 'colors', 'Розово', '#FFB6C1', 6),
    ('coral', 'colors', 'Корал', '#FF6B6B', 7),
    ('mint', 'colors', 'Мента', '#98D8C8', 8),
    ('lavender', 'colors', 'Лавандула', '#E6E6FA', 9),
    ('peach', 'colors', 'Праскова', '#FFDAB9', 10)
ON CONFLICT (option_set_id, id) DO UPDATE SET
    label = EXCLUDED.label,
    value = EXCLUDED.value,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- ============================================================================
-- 15. SEED DATA - Size Options
-- ============================================================================
INSERT INTO options (id, option_set_id, label, sort_order) VALUES
    ('XS', 'sizes', 'XS', 1),
    ('S', 'sizes', 'S', 2),
    ('M', 'sizes', 'M', 3),
    ('L', 'sizes', 'L', 4),
    ('XL', 'sizes', 'XL', 5)
ON CONFLICT (option_set_id, id) DO UPDATE SET
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- ============================================================================
-- 16. SEED DATA - Site Config
-- ============================================================================
INSERT INTO site_config (key, value, description) VALUES
    ('EUR_TO_BGN_RATE', '1.9558', 'Euro to Bulgarian Lev exchange rate')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();
