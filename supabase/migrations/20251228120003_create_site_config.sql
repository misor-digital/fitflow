-- Migration: Create site_config table for business configuration
-- This table stores key-value configuration like currency rates
-- Replaces hardcoded EUR_TO_BGN_RATE and other config values

-- Create the site_config table
CREATE TABLE IF NOT EXISTS site_config (
  key TEXT PRIMARY KEY,  -- Config key (e.g., 'EUR_TO_BGN_RATE')
  value TEXT NOT NULL,  -- Config value (stored as text, parsed by application)
  description TEXT,  -- Human-readable description
  value_type TEXT NOT NULL DEFAULT 'string',  -- Type hint: 'string', 'number', 'boolean', 'json'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_site_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_site_config_updated_at ON site_config;
CREATE TRIGGER update_site_config_updated_at
  BEFORE UPDATE ON site_config
  FOR EACH ROW
  EXECUTE FUNCTION update_site_config_updated_at();

-- Enable Row Level Security
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous read access (public config)
DROP POLICY IF EXISTS "Allow anon read site_config" ON site_config;
CREATE POLICY "Allow anon read site_config" ON site_config
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Allow authenticated read access
DROP POLICY IF EXISTS "Allow authenticated read site_config" ON site_config;
CREATE POLICY "Allow authenticated read site_config" ON site_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow service role full access
DROP POLICY IF EXISTS "Allow service role full access site_config" ON site_config;
CREATE POLICY "Allow service role full access site_config" ON site_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON site_config TO anon;
GRANT SELECT ON site_config TO authenticated;
GRANT ALL ON site_config TO service_role;

-- Seed initial configuration
INSERT INTO site_config (key, value, description, value_type) VALUES
  ('EUR_TO_BGN_RATE', '1.9558', 'Fixed EUR to BGN conversion rate', 'number'),
  ('FREE_SHIPPING_THRESHOLD_EUR', '0', 'Minimum order value for free shipping (0 = always free)', 'number'),
  ('PREORDER_ENABLED', 'true', 'Whether preorders are currently accepted', 'boolean')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  value_type = EXCLUDED.value_type,
  updated_at = NOW();

-- Add comments for documentation
COMMENT ON TABLE site_config IS 'Key-value store for site-wide configuration';
COMMENT ON COLUMN site_config.key IS 'Unique configuration key';
COMMENT ON COLUMN site_config.value IS 'Configuration value (stored as text)';
COMMENT ON COLUMN site_config.value_type IS 'Type hint for parsing: string, number, boolean, json';
