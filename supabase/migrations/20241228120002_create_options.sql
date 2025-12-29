-- Migration: Create options table for form option sets
-- This table stores configurable options for sports, colors, flavors, dietary, sizes
-- Replaces hardcoded SPORT_LABELS, FLAVOR_LABELS, DIETARY_LABELS, COLOR_NAMES, COLORS

-- Create the options table
CREATE TABLE IF NOT EXISTS options (
  id TEXT NOT NULL,  -- Option value/key (e.g., 'fitness', 'chocolate', '#000000')
  option_set_id TEXT NOT NULL,  -- Group identifier (e.g., 'sports', 'flavors', 'colors')
  label TEXT NOT NULL,  -- Display label in Bulgarian
  value TEXT,  -- Optional additional value (e.g., hex color code)
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (option_set_id, id)
);

-- Create index for option set lookups
CREATE INDEX IF NOT EXISTS idx_options_set ON options(option_set_id, sort_order) WHERE is_enabled = true;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_options_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_options_updated_at ON options;
CREATE TRIGGER update_options_updated_at
  BEFORE UPDATE ON options
  FOR EACH ROW
  EXECUTE FUNCTION update_options_updated_at();

-- Enable Row Level Security
ALTER TABLE options ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous read access (public catalog data)
DROP POLICY IF EXISTS "Allow anon read options" ON options;
CREATE POLICY "Allow anon read options" ON options
  FOR SELECT
  TO anon
  USING (is_enabled = true);

-- Policy: Allow authenticated read access
DROP POLICY IF EXISTS "Allow authenticated read options" ON options;
CREATE POLICY "Allow authenticated read options" ON options
  FOR SELECT
  TO authenticated
  USING (is_enabled = true);

-- Policy: Allow service role full access
DROP POLICY IF EXISTS "Allow service role full access options" ON options;
CREATE POLICY "Allow service role full access options" ON options
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON options TO anon;
GRANT SELECT ON options TO authenticated;
GRANT ALL ON options TO service_role;

-- Seed Sports options
INSERT INTO options (option_set_id, id, label, sort_order) VALUES
  ('sports', 'fitness', 'Фитнес', 1),
  ('sports', 'dance', 'Танци', 2),
  ('sports', 'yoga', 'Йога/пилатес', 3),
  ('sports', 'running', 'Бягане', 4),
  ('sports', 'swimming', 'Плуване', 5),
  ('sports', 'team', 'Отборен спорт', 6),
  ('sports', 'other', 'Други', 99)
ON CONFLICT (option_set_id, id) DO UPDATE SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Seed Colors options (with hex values)
INSERT INTO options (option_set_id, id, label, value, sort_order) VALUES
  ('colors', '#000000', 'Черно', '#000000', 1),
  ('colors', '#FFFFFF', 'Бяло', '#FFFFFF', 2),
  ('colors', '#8A8A8A', 'Сиво', '#8A8A8A', 3),
  ('colors', '#0A1A33', 'Тъмно синьо', '#0A1A33', 4),
  ('colors', '#7EC8E3', 'Светло синьо', '#7EC8E3', 5),
  ('colors', '#F4C2C2', 'Розово', '#F4C2C2', 6),
  ('colors', '#8d010d', 'Бордо', '#8d010d', 7),
  ('colors', '#B497D6', 'Лилаво', '#B497D6', 8),
  ('colors', '#556B2F', 'Маслинено зелено', '#556B2F', 9),
  ('colors', '#FB7D00', 'Оранжево', '#FB7D00', 10)
ON CONFLICT (option_set_id, id) DO UPDATE SET
  label = EXCLUDED.label,
  value = EXCLUDED.value,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Seed Flavors options
INSERT INTO options (option_set_id, id, label, sort_order) VALUES
  ('flavors', 'chocolate', 'Шоколад', 1),
  ('flavors', 'strawberry', 'Ягода', 2),
  ('flavors', 'vanilla', 'Ванилия', 3),
  ('flavors', 'salted-caramel', 'Солен карамел', 4),
  ('flavors', 'biscuit', 'Бисквита', 5),
  ('flavors', 'other', 'Други', 99)
ON CONFLICT (option_set_id, id) DO UPDATE SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Seed Dietary options
INSERT INTO options (option_set_id, id, label, sort_order) VALUES
  ('dietary', 'none', 'Не', 1),
  ('dietary', 'lactose', 'Без лактоза', 2),
  ('dietary', 'gluten', 'Без глутен', 3),
  ('dietary', 'vegan', 'Веган', 4),
  ('dietary', 'other', 'Други', 99)
ON CONFLICT (option_set_id, id) DO UPDATE SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Seed Sizes options
INSERT INTO options (option_set_id, id, label, sort_order) VALUES
  ('sizes', 'XS', 'XS', 1),
  ('sizes', 'S', 'S', 2),
  ('sizes', 'M', 'M', 3),
  ('sizes', 'L', 'L', 4),
  ('sizes', 'XL', 'XL', 5)
ON CONFLICT (option_set_id, id) DO UPDATE SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Add comments for documentation
COMMENT ON TABLE options IS 'Configurable option sets for form selections (sports, colors, flavors, etc.)';
COMMENT ON COLUMN options.id IS 'Option value/key used in code';
COMMENT ON COLUMN options.option_set_id IS 'Group identifier (sports, colors, flavors, dietary, sizes)';
COMMENT ON COLUMN options.label IS 'Display label in Bulgarian';
COMMENT ON COLUMN options.value IS 'Optional additional value (e.g., hex color code)';
COMMENT ON COLUMN options.is_enabled IS 'Soft delete flag';
