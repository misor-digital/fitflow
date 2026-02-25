-- ============================================================================
-- Addresses Table
-- ============================================================================

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

-- Indexes
CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_user_id_default ON addresses(user_id) WHERE is_default = true;

-- Reuse existing updated_at trigger
CREATE TRIGGER trigger_addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Default Address Enforcement Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION enforce_single_default_address()
RETURNS TRIGGER AS $$
DECLARE
  address_count INTEGER;
BEGIN
  -- Count existing addresses for this user (excluding current row on UPDATE)
  IF TG_OP = 'INSERT' THEN
    SELECT COUNT(*) INTO address_count FROM addresses WHERE user_id = NEW.user_id;
  ELSE
    SELECT COUNT(*) INTO address_count FROM addresses WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;

  -- If this is the only address, force it as default
  IF address_count = 0 THEN
    NEW.is_default := true;
    RETURN NEW;
  END IF;

  -- If setting as default, unset all others
  IF NEW.is_default = true THEN
    UPDATE addresses SET is_default = false WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_enforce_single_default_address
  BEFORE INSERT OR UPDATE ON addresses
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_default_address();

-- ============================================================================
-- Ensure Default on Delete Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION ensure_default_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act if the deleted address was the default
  IF OLD.is_default = true THEN
    -- Promote the most recently created remaining address to default
    UPDATE addresses
    SET is_default = true
    WHERE id = (
      SELECT id FROM addresses
      WHERE user_id = OLD.user_id
      ORDER BY created_at DESC
      LIMIT 1
    );
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_default_on_delete
  AFTER DELETE ON addresses
  FOR EACH ROW
  EXECUTE FUNCTION ensure_default_on_delete();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY addresses_select_own ON addresses
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY addresses_insert_own ON addresses
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY addresses_update_own ON addresses
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY addresses_delete_own ON addresses
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY addresses_service_role ON addresses
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Grants
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON addresses TO authenticated;
GRANT ALL ON addresses TO service_role;
