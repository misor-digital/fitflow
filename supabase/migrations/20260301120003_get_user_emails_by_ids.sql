-- Function: get_user_emails_by_ids
-- Batch-fetch emails from auth.users in a single call.
-- Callable via PostgREST RPC with service-role key.

CREATE OR REPLACE FUNCTION get_user_emails_by_ids(user_ids UUID[])
RETURNS TABLE(id UUID, email TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT u.id, u.email::TEXT
  FROM auth.users u
  WHERE u.id = ANY(user_ids);
$$;

-- Only service-role (postgres) can call this — not exposed to anon/authenticated
REVOKE ALL ON FUNCTION get_user_emails_by_ids(UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_user_emails_by_ids(UUID[]) FROM anon;
REVOKE ALL ON FUNCTION get_user_emails_by_ids(UUID[]) FROM authenticated;
