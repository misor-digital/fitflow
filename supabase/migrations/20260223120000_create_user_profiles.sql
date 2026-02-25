-- ============================================================================
-- FitFlow Auth Schema: User Profiles, Enums, and RLS
-- ============================================================================

-- 1. Create enums
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

-- 2. Create user_profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,

  -- Type & role
  user_type user_type NOT NULL DEFAULT 'customer',
  staff_role staff_role,               -- NULL for customers
  is_subscriber BOOLEAN NOT NULL DEFAULT false,

  -- Constraints: staff must have a role, customers must not
  CONSTRAINT staff_must_have_role CHECK (
    (user_type = 'staff' AND staff_role IS NOT NULL) OR
    (user_type = 'customer' AND staff_role IS NULL)
  ),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX idx_user_profiles_user_type ON user_profiles(user_type);
CREATE INDEX idx_user_profiles_staff_role ON user_profiles(staff_role) WHERE staff_role IS NOT NULL;
CREATE INDEX idx_user_profiles_email ON user_profiles USING btree (id);

-- 4. Auto-update updated_at trigger (reuses existing function)
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Add user_id column to preorders (nullable — existing rows have no user)
ALTER TABLE preorders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_preorders_user_id ON preorders(user_id) WHERE user_id IS NOT NULL;

-- 6. Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can update their own non-role fields
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND user_type = (SELECT user_type FROM user_profiles WHERE id = auth.uid())
    AND staff_role IS NOT DISTINCT FROM (SELECT staff_role FROM user_profiles WHERE id = auth.uid())
  );

-- Staff with admin+ roles can read all profiles
CREATE POLICY "Staff admins can read all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'staff'
      AND up.staff_role IN ('super_admin', 'admin', 'manager')
    )
  );

-- Only super_admin can insert/update staff profiles
CREATE POLICY "Super admin manages staff"
  ON user_profiles FOR ALL
  TO authenticated
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

-- Service role bypasses RLS (existing grant pattern)
CREATE POLICY "Service role full access on user_profiles"
  ON user_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 7. Update preorders RLS: authenticated users can read their own
CREATE POLICY "Users can read own preorders"
  ON preorders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 8. Auto-create profile on signup via trigger
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 9. Comments
COMMENT ON TABLE user_profiles IS 'Extended profile for auth.users — stores name, type, role, and subscriber flag';
COMMENT ON COLUMN user_profiles.user_type IS 'customer or staff';
COMMENT ON COLUMN user_profiles.staff_role IS 'Staff-only role. NULL for customers. Enforced by CHECK constraint.';
COMMENT ON COLUMN user_profiles.is_subscriber IS 'Whether the user is subscribed to marketing emails';
COMMENT ON COLUMN preorders.user_id IS 'FK to auth.users — NULL for anonymous preorders, set when user links their preorder';
