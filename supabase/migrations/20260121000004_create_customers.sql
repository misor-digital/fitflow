-- Migration: Create customers table
-- Purpose: Customer portal identity for authenticated users
-- Part of Phase 2: Customer Accounts + Staff Foundation

-- Create the customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  preferred_language TEXT DEFAULT 'bg' CHECK (preferred_language IN ('bg', 'en')),
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  marketing_consent_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);

-- Create index on marketing consent for filtering
CREATE INDEX IF NOT EXISTS idx_customers_marketing_consent ON customers(marketing_consent) WHERE marketing_consent = true;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at();

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own customer record
DROP POLICY IF EXISTS "Users can read own customer record" ON customers;
CREATE POLICY "Users can read own customer record" ON customers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can update their own customer record
DROP POLICY IF EXISTS "Users can update own customer record" ON customers;
CREATE POLICY "Users can update own customer record" ON customers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Service role has full access
DROP POLICY IF EXISTS "Service role full access customers" ON customers;
CREATE POLICY "Service role full access customers" ON customers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT, UPDATE ON customers TO authenticated;
GRANT ALL ON customers TO service_role;

-- Add comments for documentation
COMMENT ON TABLE customers IS 'Customer portal identity for authenticated users';
COMMENT ON COLUMN customers.user_id IS 'FK to auth.users.id (one-to-one)';
COMMENT ON COLUMN customers.full_name IS 'Customer full name';
COMMENT ON COLUMN customers.phone IS 'Customer phone number';
COMMENT ON COLUMN customers.preferred_language IS 'Preferred language for communications (bg or en)';
COMMENT ON COLUMN customers.marketing_consent IS 'Whether customer consented to marketing emails';
COMMENT ON COLUMN customers.marketing_consent_date IS 'When marketing consent was given';

-- Create trigger to log customer creation
CREATE OR REPLACE FUNCTION log_customer_creation()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_audit_log(
    'customer'::actor_type,
    NEW.user_id,
    (SELECT email FROM auth.users WHERE id = NEW.user_id),
    'customer.created',
    'customer',
    NEW.id,
    jsonb_build_object(
      'full_name', NEW.full_name,
      'marketing_consent', NEW.marketing_consent
    ),
    NULL,
    NULL
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_customer_creation_trigger ON customers;
CREATE TRIGGER log_customer_creation_trigger
  AFTER INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION log_customer_creation();

-- Create trigger to log customer updates
CREATE OR REPLACE FUNCTION log_customer_update()
RETURNS TRIGGER AS $$
DECLARE
  v_changes JSONB;
BEGIN
  -- Build a JSONB object of changed fields
  v_changes := jsonb_build_object(
    'old', jsonb_build_object(
      'full_name', OLD.full_name,
      'phone', OLD.phone,
      'marketing_consent', OLD.marketing_consent
    ),
    'new', jsonb_build_object(
      'full_name', NEW.full_name,
      'phone', NEW.phone,
      'marketing_consent', NEW.marketing_consent
    )
  );
  
  PERFORM create_audit_log(
    'customer'::actor_type,
    NEW.user_id,
    (SELECT email FROM auth.users WHERE id = NEW.user_id),
    'customer.updated',
    'customer',
    NEW.id,
    v_changes,
    NULL,
    NULL
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_customer_update_trigger ON customers;
CREATE TRIGGER log_customer_update_trigger
  AFTER UPDATE ON customers
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION log_customer_update();

COMMENT ON FUNCTION log_customer_creation IS 'Logs customer creation to audit_logs';
COMMENT ON FUNCTION log_customer_update IS 'Logs customer updates to audit_logs';
