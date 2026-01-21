-- Migration: Create preorder_edit_tokens table
-- Purpose: Secure, time-limited, one-time-use tokens for preorder editing
-- Part of Phase 1: Minimal Safe Foundation

-- Create the preorder_edit_tokens table
CREATE TABLE IF NOT EXISTS preorder_edit_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  preorder_id UUID NOT NULL REFERENCES preorders(id) ON DELETE CASCADE,
  token UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  purpose TEXT NOT NULL CHECK (purpose IN ('edit', 'cancel')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for token lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_preorder_edit_tokens_token ON preorder_edit_tokens(token);

-- Create index for preorder_id lookups
CREATE INDEX IF NOT EXISTS idx_preorder_edit_tokens_preorder_id ON preorder_edit_tokens(preorder_id);

-- Create index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_preorder_edit_tokens_expires_at ON preorder_edit_tokens(expires_at);

-- Enable Row Level Security
ALTER TABLE preorder_edit_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access (tokens are validated server-side)
DROP POLICY IF EXISTS "Allow service role full access preorder_edit_tokens" ON preorder_edit_tokens;
CREATE POLICY "Allow service role full access preorder_edit_tokens" ON preorder_edit_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No anon/authenticated access - all token operations go through API

-- Grant permissions
GRANT ALL ON preorder_edit_tokens TO service_role;

-- Add comments for documentation
COMMENT ON TABLE preorder_edit_tokens IS 'Secure tokens for preorder editing via email link';
COMMENT ON COLUMN preorder_edit_tokens.token IS 'UUID v4 token sent in email link';
COMMENT ON COLUMN preorder_edit_tokens.purpose IS 'Token purpose: edit or cancel';
COMMENT ON COLUMN preorder_edit_tokens.expires_at IS 'Token expiry timestamp (default 24h)';
COMMENT ON COLUMN preorder_edit_tokens.used_at IS 'Timestamp when token was used (null = unused)';

-- Function to clean up expired tokens (run daily via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_preorder_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM preorder_edit_tokens
  WHERE expires_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_preorder_tokens IS 'Deletes expired tokens older than 7 days';
