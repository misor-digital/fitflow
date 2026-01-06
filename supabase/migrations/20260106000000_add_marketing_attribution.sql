-- Migration: Add marketing attribution for campaign → preorder tracking
-- This migration creates the marketing_clicks table and adds attribution columns to preorders

-- ============================================================================
-- Marketing Clicks Table
-- Tracks clicks from marketing campaign emails to enable attribution
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketing_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES marketing_recipients(id) ON DELETE SET NULL,
  click_token TEXT UNIQUE NOT NULL,
  utm_source TEXT NOT NULL DEFAULT 'email',
  utm_medium TEXT NOT NULL DEFAULT 'campaign',
  utm_campaign TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for marketing_clicks
CREATE INDEX IF NOT EXISTS idx_marketing_clicks_campaign ON marketing_clicks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_clicks_token ON marketing_clicks(click_token);
CREATE INDEX IF NOT EXISTS idx_marketing_clicks_recipient ON marketing_clicks(recipient_id);
CREATE INDEX IF NOT EXISTS idx_marketing_clicks_created ON marketing_clicks(created_at DESC);

-- Enable RLS on marketing_clicks
ALTER TABLE marketing_clicks ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Server-only access (service_role)
DROP POLICY IF EXISTS "Allow service role full access marketing_clicks" ON marketing_clicks;
CREATE POLICY "Allow service role full access marketing_clicks" ON marketing_clicks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON marketing_clicks TO service_role;

-- ============================================================================
-- Add Attribution Columns to Preorders Table
-- These fields are written ONCE at preorder creation, never updated
-- ============================================================================

ALTER TABLE preorders
ADD COLUMN IF NOT EXISTS marketing_campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS marketing_recipient_id UUID REFERENCES marketing_recipients(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS marketing_click_id UUID REFERENCES marketing_clicks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_medium TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

-- Index for attribution queries (only on non-null values)
CREATE INDEX IF NOT EXISTS idx_preorders_marketing_campaign 
  ON preorders(marketing_campaign_id) 
  WHERE marketing_campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_preorders_marketing_recipient 
  ON preorders(marketing_recipient_id) 
  WHERE marketing_recipient_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_preorders_utm_campaign 
  ON preorders(utm_campaign) 
  WHERE utm_campaign IS NOT NULL;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE marketing_clicks IS 'Tracks clicks from marketing campaign emails for attribution';
COMMENT ON COLUMN marketing_clicks.click_token IS 'Unique, signed token included in email CTA links (mc parameter)';
COMMENT ON COLUMN marketing_clicks.campaign_id IS 'The campaign this click originated from';
COMMENT ON COLUMN marketing_clicks.recipient_id IS 'The recipient who clicked (nullable if unknown)';
COMMENT ON COLUMN marketing_clicks.utm_source IS 'UTM source parameter (default: email)';
COMMENT ON COLUMN marketing_clicks.utm_medium IS 'UTM medium parameter (default: campaign)';
COMMENT ON COLUMN marketing_clicks.utm_campaign IS 'UTM campaign parameter (campaign identifier)';

COMMENT ON COLUMN preorders.marketing_campaign_id IS 'Campaign that led to this preorder (nullable for non-campaign orders)';
COMMENT ON COLUMN preorders.marketing_recipient_id IS 'Recipient who converted (nullable)';
COMMENT ON COLUMN preorders.marketing_click_id IS 'Click record that led to this preorder (nullable)';
COMMENT ON COLUMN preorders.utm_source IS 'UTM source at time of preorder (nullable)';
COMMENT ON COLUMN preorders.utm_medium IS 'UTM medium at time of preorder (nullable)';
COMMENT ON COLUMN preorders.utm_campaign IS 'UTM campaign at time of preorder (nullable)';

-- ============================================================================
-- Helper Function: Get Campaign Attribution Stats
-- ============================================================================

CREATE OR REPLACE FUNCTION get_campaign_attribution_stats(p_campaign_id UUID)
RETURNS TABLE (
  total_clicks BIGINT,
  unique_recipients BIGINT,
  total_conversions BIGINT,
  total_revenue NUMERIC,
  conversion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT mc.id)::BIGINT as total_clicks,
    COUNT(DISTINCT mc.recipient_id)::BIGINT as unique_recipients,
    COUNT(DISTINCT p.id)::BIGINT as total_conversions,
    COALESCE(SUM(p.final_price_eur), 0)::NUMERIC as total_revenue,
    CASE 
      WHEN COUNT(DISTINCT mc.id) = 0 THEN 0
      ELSE ROUND((COUNT(DISTINCT p.id)::NUMERIC / COUNT(DISTINCT mc.id)::NUMERIC) * 100, 2)
    END as conversion_rate
  FROM marketing_clicks mc
  LEFT JOIN preorders p ON p.marketing_click_id = mc.id
  WHERE mc.campaign_id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on function
GRANT EXECUTE ON FUNCTION get_campaign_attribution_stats(UUID) TO service_role;
