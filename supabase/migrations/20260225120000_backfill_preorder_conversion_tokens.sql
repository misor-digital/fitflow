-- ============================================================================
-- Backfill Missing Preorder Conversion Tokens
--
-- Target: all preorders where conversion_token IS NULL.
-- For each affected row:
--   - Generates a fresh UUID conversion token.
--   - Resets conversion_status to 'pending' so the recipient builder
--     includes them in the next preorder-conversion campaign.
--   - Sets conversion_token_expires_at to NOW() + 90 days only when the
--     column is currently NULL (existing expiry timestamps are preserved).
--
-- Safe to re-run: the WHERE clause ensures only rows that still lack a token
-- are touched on subsequent executions.
-- ============================================================================

UPDATE preorders
SET
  conversion_token          = gen_random_uuid(),
  conversion_status         = 'pending',
  conversion_token_expires_at = COALESCE(
                                  conversion_token_expires_at,
                                  NOW() + INTERVAL '90 days'
                                )
WHERE conversion_token IS NULL;
