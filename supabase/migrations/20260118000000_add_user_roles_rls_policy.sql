-- Migration: Add RLS policy for authenticated users to read their own roles
-- This allows middleware and server components to query user_roles without service-role key

-- Drop existing policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Allow users to read their own roles" ON user_roles;

-- Create policy allowing authenticated users to read their own roles
CREATE POLICY "Allow users to read their own roles" ON user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Grant SELECT permission to authenticated role
GRANT SELECT ON user_roles TO authenticated;

COMMENT ON POLICY "Allow users to read their own roles" ON user_roles IS 
  'Allows authenticated users to read their own role assignments without requiring service_role key';
