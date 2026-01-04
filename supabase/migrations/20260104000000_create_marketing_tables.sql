-- Migration: Create marketing campaign tables
-- This migration creates tables for managing email marketing campaigns

-- ============================================================================
-- Campaign Status Enum
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE campaign_status AS ENUM (
      'draft',       -- Campaign is being created/edited
      'scheduled',   -- Campaign is scheduled for future send
      'sending',     -- Campaign is currently being sent
      'paused',      -- Campaign was paused mid-send
      'completed',   -- Campaign finished sending
      'cancelled'    -- Campaign was cancelled
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- Send Status Enum
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE send_status AS ENUM (
      'queued',      -- Waiting to be sent
      'sending',     -- Currently being processed
      'sent',        -- Successfully sent
      'failed',      -- Failed to send (will retry)
      'skipped',     -- Skipped (unsubscribed, duplicate, etc.)
      'bounced'      -- Email bounced
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- Marketing Campaigns Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,                              -- Internal campaign name
  subject TEXT NOT NULL,                           -- Email subject line
  template TEXT NOT NULL,                          -- HTML template content
  preview_text TEXT,                               -- Email preview text
  scheduled_start_at TIMESTAMPTZ,                  -- When to start sending
  status campaign_status NOT NULL DEFAULT 'draft',
  
  -- Targeting
  recipient_filter JSONB,                          -- Optional filter criteria for recipients
  
  -- Stats (denormalized for quick access)
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  
  -- Runner lock (for distributed locking)
  locked_by TEXT,                                  -- Runner instance ID
  locked_at TIMESTAMPTZ,                           -- When lock was acquired
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,                          -- When sending actually started
  completed_at TIMESTAMPTZ                         -- When sending finished
);

-- Indexes for campaigns
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_scheduled ON marketing_campaigns(scheduled_start_at) 
  WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created ON marketing_campaigns(created_at DESC);

-- ============================================================================
-- Marketing Recipients Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS marketing_recipients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,                                       -- Optional display name
  tags TEXT[] DEFAULT '{}',                        -- Tags for segmentation
  subscribed BOOLEAN NOT NULL DEFAULT true,        -- Subscription status
  unsubscribed_at TIMESTAMPTZ,                     -- When they unsubscribed
  
  -- Metadata
  source TEXT,                                     -- Where they came from (preorder, manual, import)
  metadata JSONB,                                  -- Additional data
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint on email (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketing_recipients_email_unique 
  ON marketing_recipients(LOWER(email));

-- Indexes for recipients
CREATE INDEX IF NOT EXISTS idx_marketing_recipients_subscribed 
  ON marketing_recipients(subscribed) WHERE subscribed = true;
CREATE INDEX IF NOT EXISTS idx_marketing_recipients_tags 
  ON marketing_recipients USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_marketing_recipients_created 
  ON marketing_recipients(created_at DESC);

-- ============================================================================
-- Marketing Sends Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS marketing_sends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES marketing_recipients(id) ON DELETE SET NULL,
  email TEXT NOT NULL,                             -- Denormalized for reliability
  
  -- Status tracking
  status send_status NOT NULL DEFAULT 'queued',
  
  -- Provider response
  provider_message_id TEXT,                        -- Message ID from email provider
  error TEXT,                                      -- Error message if failed
  
  -- Retry tracking
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,                             -- When successfully sent
  
  -- Prevent duplicate sends per campaign
  CONSTRAINT unique_campaign_recipient UNIQUE(campaign_id, email)
);

-- Indexes for sends
CREATE INDEX IF NOT EXISTS idx_marketing_sends_campaign ON marketing_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_sends_status ON marketing_sends(status);
CREATE INDEX IF NOT EXISTS idx_marketing_sends_queued ON marketing_sends(campaign_id, status, next_retry_at) 
  WHERE status IN ('queued', 'failed');
CREATE INDEX IF NOT EXISTS idx_marketing_sends_recipient ON marketing_sends(recipient_id);

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

-- Campaigns
CREATE OR REPLACE FUNCTION update_marketing_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_marketing_campaigns_updated_at ON marketing_campaigns;
CREATE TRIGGER update_marketing_campaigns_updated_at
  BEFORE UPDATE ON marketing_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_campaigns_updated_at();

-- Recipients
CREATE OR REPLACE FUNCTION update_marketing_recipients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_marketing_recipients_updated_at ON marketing_recipients;
CREATE TRIGGER update_marketing_recipients_updated_at
  BEFORE UPDATE ON marketing_recipients
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_recipients_updated_at();

-- Sends
CREATE OR REPLACE FUNCTION update_marketing_sends_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_marketing_sends_updated_at ON marketing_sends;
CREATE TRIGGER update_marketing_sends_updated_at
  BEFORE UPDATE ON marketing_sends
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_sends_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_sends ENABLE ROW LEVEL SECURITY;

-- Campaigns: service_role only
DROP POLICY IF EXISTS "Allow service role full access marketing_campaigns" ON marketing_campaigns;
CREATE POLICY "Allow service role full access marketing_campaigns" ON marketing_campaigns
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Recipients: service_role only
DROP POLICY IF EXISTS "Allow service role full access marketing_recipients" ON marketing_recipients;
CREATE POLICY "Allow service role full access marketing_recipients" ON marketing_recipients
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Sends: service_role only
DROP POLICY IF EXISTS "Allow service role full access marketing_sends" ON marketing_sends;
CREATE POLICY "Allow service role full access marketing_sends" ON marketing_sends
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Permissions
-- ============================================================================
GRANT ALL ON marketing_campaigns TO service_role;
GRANT ALL ON marketing_recipients TO service_role;
GRANT ALL ON marketing_sends TO service_role;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get campaign progress stats
CREATE OR REPLACE FUNCTION get_campaign_progress(p_campaign_id UUID)
RETURNS TABLE (
  total INTEGER,
  queued INTEGER,
  sending INTEGER,
  sent INTEGER,
  failed INTEGER,
  skipped INTEGER,
  bounced INTEGER,
  progress_percent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total,
    COUNT(*) FILTER (WHERE ms.status = 'queued')::INTEGER as queued,
    COUNT(*) FILTER (WHERE ms.status = 'sending')::INTEGER as sending,
    COUNT(*) FILTER (WHERE ms.status = 'sent')::INTEGER as sent,
    COUNT(*) FILTER (WHERE ms.status = 'failed')::INTEGER as failed,
    COUNT(*) FILTER (WHERE ms.status = 'skipped')::INTEGER as skipped,
    COUNT(*) FILTER (WHERE ms.status = 'bounced')::INTEGER as bounced,
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE ms.status IN ('sent', 'skipped', 'bounced'))::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
    END as progress_percent
  FROM marketing_sends ms
  WHERE ms.campaign_id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to acquire campaign lock (for distributed locking)
CREATE OR REPLACE FUNCTION acquire_campaign_lock(
  p_campaign_id UUID,
  p_runner_id TEXT,
  p_lock_timeout_minutes INTEGER DEFAULT 10
)
RETURNS BOOLEAN AS $$
DECLARE
  v_locked BOOLEAN;
BEGIN
  -- Try to acquire lock if not locked or lock expired
  UPDATE marketing_campaigns
  SET 
    locked_by = p_runner_id,
    locked_at = NOW()
  WHERE id = p_campaign_id
    AND (
      locked_by IS NULL 
      OR locked_at < NOW() - (p_lock_timeout_minutes || ' minutes')::INTERVAL
    )
  RETURNING true INTO v_locked;
  
  RETURN COALESCE(v_locked, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to release campaign lock
CREATE OR REPLACE FUNCTION release_campaign_lock(
  p_campaign_id UUID,
  p_runner_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_released BOOLEAN;
BEGIN
  UPDATE marketing_campaigns
  SET 
    locked_by = NULL,
    locked_at = NULL
  WHERE id = p_campaign_id
    AND locked_by = p_runner_id
  RETURNING true INTO v_released;
  
  RETURN COALESCE(v_released, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_campaign_progress(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION acquire_campaign_lock(UUID, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION release_campaign_lock(UUID, TEXT) TO service_role;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE marketing_campaigns IS 'Email marketing campaigns';
COMMENT ON TABLE marketing_recipients IS 'Marketing email recipients/subscribers';
COMMENT ON TABLE marketing_sends IS 'Individual email send records for campaigns';

COMMENT ON COLUMN marketing_campaigns.template IS 'HTML template with {{variable}} placeholders';
COMMENT ON COLUMN marketing_campaigns.recipient_filter IS 'JSON filter for targeting recipients (e.g., {"tags": ["preorder"]})';
COMMENT ON COLUMN marketing_campaigns.locked_by IS 'Runner instance ID holding the lock';
COMMENT ON COLUMN marketing_campaigns.locked_at IS 'When the lock was acquired (for timeout detection)';

COMMENT ON COLUMN marketing_recipients.tags IS 'Array of tags for segmentation (e.g., preorder, newsletter)';
COMMENT ON COLUMN marketing_recipients.source IS 'Origin of the recipient (preorder, manual, import)';

COMMENT ON COLUMN marketing_sends.attempt_count IS 'Number of send attempts made';
COMMENT ON COLUMN marketing_sends.max_attempts IS 'Maximum retry attempts before marking as failed';
COMMENT ON COLUMN marketing_sends.next_retry_at IS 'When to retry failed sends';
