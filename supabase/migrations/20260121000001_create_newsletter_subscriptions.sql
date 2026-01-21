-- Migration: Create newsletter_subscriptions table
-- Purpose: Marketing consent tracking with double opt-in
-- Part of Phase 1: Minimal Safe Foundation

-- Create enum for subscription status
DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('pending', 'subscribed', 'unsubscribed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the newsletter_subscriptions table
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  status subscription_status NOT NULL DEFAULT 'pending',
  confirmation_token UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  confirmed_at TIMESTAMPTZ,
  unsubscribe_token UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  source TEXT, -- e.g., 'homepage', 'checkout', 'footer'
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique index on email + status (allow re-subscription after unsubscribe)
CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_subscriptions_email_active 
  ON newsletter_subscriptions(LOWER(email)) 
  WHERE status IN ('pending', 'subscribed');

-- Create index for confirmation token lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_confirmation_token 
  ON newsletter_subscriptions(confirmation_token);

-- Create index for unsubscribe token lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_unsubscribe_token 
  ON newsletter_subscriptions(unsubscribe_token);

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_status 
  ON newsletter_subscriptions(status);

-- Create index for cleanup of expired pending subscriptions
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_pending_cleanup 
  ON newsletter_subscriptions(created_at) 
  WHERE status = 'pending';

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_newsletter_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_newsletter_subscriptions_updated_at ON newsletter_subscriptions;
CREATE TRIGGER update_newsletter_subscriptions_updated_at
  BEFORE UPDATE ON newsletter_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_newsletter_subscriptions_updated_at();

-- Enable Row Level Security
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access
DROP POLICY IF EXISTS "Allow service role full access newsletter_subscriptions" ON newsletter_subscriptions;
CREATE POLICY "Allow service role full access newsletter_subscriptions" ON newsletter_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No anon/authenticated access - all operations go through API

-- Grant permissions
GRANT ALL ON newsletter_subscriptions TO service_role;

-- Add comments for documentation
COMMENT ON TABLE newsletter_subscriptions IS 'Newsletter subscriptions with double opt-in';
COMMENT ON COLUMN newsletter_subscriptions.email IS 'Subscriber email address';
COMMENT ON COLUMN newsletter_subscriptions.status IS 'Subscription status: pending, subscribed, or unsubscribed';
COMMENT ON COLUMN newsletter_subscriptions.confirmation_token IS 'UUID token for email confirmation';
COMMENT ON COLUMN newsletter_subscriptions.confirmed_at IS 'Timestamp when subscription was confirmed';
COMMENT ON COLUMN newsletter_subscriptions.unsubscribe_token IS 'UUID token for unsubscribe link';
COMMENT ON COLUMN newsletter_subscriptions.source IS 'Where the subscription originated (e.g., homepage, checkout)';

-- Function to clean up expired pending subscriptions (run daily via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_newsletter_pending()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM newsletter_subscriptions
  WHERE status = 'pending' 
    AND created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_newsletter_pending IS 'Deletes pending subscriptions older than 7 days';
