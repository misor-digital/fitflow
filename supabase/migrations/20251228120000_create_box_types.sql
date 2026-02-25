-- Migration: Create box_types table
-- This table stores subscription box/plan configurations
-- Replaces hardcoded BOX_PRICES_EUR and BOX_TYPES constants

-- Create the box_types table
CREATE TABLE IF NOT EXISTS box_types (
  id TEXT PRIMARY KEY,  -- e.g., 'monthly-standard', 'onetime-premium'
  name TEXT NOT NULL,   -- Display name in Bulgarian
  description TEXT,     -- Optional description
  price_eur NUMERIC(10,2) NOT NULL,  -- Price in EUR (source of truth)
  is_subscription BOOLEAN NOT NULL DEFAULT false,  -- true for monthly plans
  is_premium BOOLEAN NOT NULL DEFAULT false,  -- true for premium tiers
  frequency TEXT,  -- 'monthly', 'seasonal', null for one-time
  sort_order INTEGER NOT NULL DEFAULT 0,  -- For display ordering
  is_enabled BOOLEAN NOT NULL DEFAULT true,  -- Soft disable without deletion
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for enabled box types (common query)
CREATE INDEX IF NOT EXISTS idx_box_types_enabled ON box_types(is_enabled) WHERE is_enabled = true;

-- Create index for sorting
CREATE INDEX IF NOT EXISTS idx_box_types_sort ON box_types(sort_order);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_box_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_box_types_updated_at ON box_types;
CREATE TRIGGER update_box_types_updated_at
  BEFORE UPDATE ON box_types
  FOR EACH ROW
  EXECUTE FUNCTION update_box_types_updated_at();

-- Enable Row Level Security
ALTER TABLE box_types ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous read access (public catalog data)
DROP POLICY IF EXISTS "Allow anon read box_types" ON box_types;
CREATE POLICY "Allow anon read box_types" ON box_types
  FOR SELECT
  TO anon
  USING (is_enabled = true);

-- Policy: Allow authenticated read access
DROP POLICY IF EXISTS "Allow authenticated read box_types" ON box_types;
CREATE POLICY "Allow authenticated read box_types" ON box_types
  FOR SELECT
  TO authenticated
  USING (is_enabled = true);

-- Policy: Allow service role full access (for admin)
DROP POLICY IF EXISTS "Allow service role full access box_types" ON box_types;
CREATE POLICY "Allow service role full access box_types" ON box_types
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON box_types TO anon;
GRANT SELECT ON box_types TO authenticated;
GRANT ALL ON box_types TO service_role;

-- Seed initial data (matching current hardcoded values)
INSERT INTO box_types (id, name, description, price_eur, is_subscription, is_premium, frequency, sort_order) VALUES
  ('monthly-standard', 'Месечна - Стандартна', 'Получаваш кутия с 5-7 продукта, включително протеинови продукти, хранителни добавки и спортни аксесоари', 24.90, true, false, 'monthly', 1),
  ('monthly-premium', 'Месечна - Премиум', 'Получаваш всичко от стандартната кутия плюс спортно облекло', 34.90, true, true, 'monthly', 2),
  ('monthly-premium-monthly', 'Месечна - Премиум (всеки месец)', 'Получаваш всичко от стандартната кутия плюс спортно облекло - доставка всеки месец', 34.90, true, true, 'monthly', 3),
  ('monthly-premium-seasonal', 'Месечна - Премиум (всеки 3 месеца)', 'Получаваш всичко от стандартната кутия плюс спортно облекло - доставка на всеки 3 месеца', 34.90, true, true, 'seasonal', 4),
  ('onetime-standard', 'Еднократна - Стандартна', 'Получаваш кутия с 5-7 продукта, включително протеинови продукти, хранителни добавки и спортни аксесоари', 29.90, false, false, NULL, 5),
  ('onetime-premium', 'Еднократна - Премиум', 'Получаваш всичко от стандартната кутия плюс спортно облекло', 39.90, false, true, NULL, 6)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_eur = EXCLUDED.price_eur,
  is_subscription = EXCLUDED.is_subscription,
  is_premium = EXCLUDED.is_premium,
  frequency = EXCLUDED.frequency,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Add comments for documentation
COMMENT ON TABLE box_types IS 'Subscription box types and pricing configuration';
COMMENT ON COLUMN box_types.id IS 'Unique identifier used in code (e.g., monthly-standard)';
COMMENT ON COLUMN box_types.name IS 'Display name in Bulgarian';
COMMENT ON COLUMN box_types.price_eur IS 'Price in EUR - source of truth for pricing';
COMMENT ON COLUMN box_types.is_subscription IS 'Whether this is a recurring subscription';
COMMENT ON COLUMN box_types.is_premium IS 'Whether this is a premium tier (includes clothing)';
COMMENT ON COLUMN box_types.frequency IS 'Delivery frequency: monthly, seasonal, or null for one-time';
COMMENT ON COLUMN box_types.is_enabled IS 'Soft delete flag - disabled types are hidden from customers';
