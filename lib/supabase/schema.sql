-- FitFlow Preorders Database Schema
-- Run this SQL in your Supabase SQL Editor to create the preorders table

-- Create enum type for box types (if not exists)
DO $$ BEGIN
    CREATE TYPE box_type AS ENUM (
      'monthly-standard',
      'monthly-premium',
      'monthly-premium-monthly',
      'monthly-premium-seasonal',
      'onetime-standard',
      'onetime-premium'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the preorders table
CREATE TABLE IF NOT EXISTS preorders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Contact Information (Step 3)
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  
  -- Box Selection (Step 1)
  box_type box_type NOT NULL,
  
  -- Personalization Flag (Step 2)
  wants_personalization BOOLEAN NOT NULL DEFAULT false,
  
  -- Personalization Preferences (Step 2)
  sports TEXT[] DEFAULT NULL,
  sport_other TEXT,
  colors TEXT[] DEFAULT NULL,
  contents TEXT[] DEFAULT NULL,
  flavors TEXT[] DEFAULT NULL,
  flavor_other TEXT,
  size_upper TEXT,
  size_lower TEXT,
  dietary TEXT[] DEFAULT NULL,
  dietary_other TEXT,
  additional_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_preorders_email ON preorders(email);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_preorders_created_at ON preorders(created_at DESC);

-- Create index on box_type for filtering
CREATE INDEX IF NOT EXISTS idx_preorders_box_type ON preorders(box_type);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at on row updates (drop first if exists)
DROP TRIGGER IF EXISTS update_preorders_updated_at ON preorders;
CREATE TRIGGER update_preorders_updated_at
  BEFORE UPDATE ON preorders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE preorders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow anonymous inserts" ON preorders;
DROP POLICY IF EXISTS "Allow service role to read all" ON preorders;
DROP POLICY IF EXISTS "Allow users to read own preorders" ON preorders;
DROP POLICY IF EXISTS "Allow anon inserts" ON preorders;

-- Create policy to allow inserts from anonymous users (for the preorder form)
-- This is the key policy that allows the form to work
CREATE POLICY "Allow anon inserts" ON preorders
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create policy to allow service role full access (for admin)
CREATE POLICY "Allow service role full access" ON preorders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT INSERT ON preorders TO anon;
GRANT SELECT ON preorders TO authenticated;
GRANT ALL ON preorders TO service_role;

-- Comment on table
COMMENT ON TABLE preorders IS 'Stores FitFlow subscription box preorder information';
COMMENT ON COLUMN preorders.box_type IS 'Type of subscription box selected in Step 1';
COMMENT ON COLUMN preorders.wants_personalization IS 'Whether user opted for personalized box in Step 2';
COMMENT ON COLUMN preorders.sports IS 'Array of sports/activities selected for personalization';
COMMENT ON COLUMN preorders.colors IS 'Array of preferred colors';
COMMENT ON COLUMN preorders.contents IS 'Array of preferred box contents (supplements, apparel, etc.)';
COMMENT ON COLUMN preorders.flavors IS 'Array of preferred flavors for supplements';
COMMENT ON COLUMN preorders.dietary IS 'Array of dietary restrictions/preferences';
