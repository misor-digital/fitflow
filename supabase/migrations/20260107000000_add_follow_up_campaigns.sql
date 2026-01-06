-- Migration: Add follow-up campaign support and reporting functions
-- This migration extends the marketing system with:
-- 1. Follow-up campaign relationships (parent_campaign_id, campaign_type)
-- 2. Reporting aggregation functions for campaign → lead conversion

-- ============================================================================
-- Extend marketing_campaigns for follow-up support
-- ============================================================================

-- Add campaign type enum
DO $$ BEGIN
    CREATE TYPE campaign_type AS ENUM ('primary', 'follow_up');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add follow-up columns to marketing_campaigns
ALTER TABLE marketing_campaigns
ADD COLUMN IF NOT EXISTS parent_campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS campaign_type campaign_type NOT NULL DEFAULT 'primary',
ADD COLUMN IF NOT EXISTS follow_up_window_hours INTEGER DEFAULT 48;

-- Index for finding follow-up campaigns by parent
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_parent 
  ON marketing_campaigns(parent_campaign_id) 
  WHERE parent_campaign_id IS NOT NULL;

-- Index for campaign type queries
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_type 
  ON marketing_campaigns(campaign_type);

-- ============================================================================
-- Reporting Function: Get Campaign Reporting Stats
-- ============================================================================

CREATE OR REPLACE FUNCTION get_campaign_reporting_stats(p_campaign_id UUID)
RETURNS TABLE (
  total_eligible BIGINT,
  total_sent BIGINT,
  total_failed BIGINT,
  total_skipped BIGINT,
  total_clicks BIGINT,
  unique_clickers BIGINT,
  total_leads BIGINT,
  total_revenue NUMERIC,
  sent_to_lead_rate NUMERIC,
  click_to_lead_rate NUMERIC,
  campaign_start TIMESTAMPTZ,
  campaign_end TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH send_stats AS (
    SELECT 
      COUNT(*)::BIGINT as total,
      COUNT(*) FILTER (WHERE status = 'sent')::BIGINT as sent,
      COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed,
      COUNT(*) FILTER (WHERE status = 'skipped')::BIGINT as skipped
    FROM marketing_sends
    WHERE campaign_id = p_campaign_id
  ),
  click_stats AS (
    SELECT 
      COUNT(*)::BIGINT as total_clicks,
      COUNT(DISTINCT recipient_id)::BIGINT as unique_clickers
    FROM marketing_clicks
    WHERE campaign_id = p_campaign_id
  ),
  lead_stats AS (
    SELECT 
      COUNT(*)::BIGINT as total_leads,
      COALESCE(SUM(final_price_eur), 0)::NUMERIC as total_revenue
    FROM preorders
    WHERE marketing_campaign_id = p_campaign_id
  ),
  campaign_info AS (
    SELECT 
      scheduled_start_at,
      COALESCE(completed_at, NOW()) as end_time
    FROM marketing_campaigns
    WHERE id = p_campaign_id
  )
  SELECT 
    ss.total as total_eligible,
    ss.sent as total_sent,
    ss.failed as total_failed,
    ss.skipped as total_skipped,
    cs.total_clicks,
    cs.unique_clickers,
    ls.total_leads,
    ls.total_revenue,
    CASE 
      WHEN ss.sent = 0 THEN 0
      ELSE ROUND((ls.total_leads::NUMERIC / ss.sent::NUMERIC) * 100, 2)
    END as sent_to_lead_rate,
    CASE 
      WHEN cs.unique_clickers = 0 THEN 0
      ELSE ROUND((ls.total_leads::NUMERIC / cs.unique_clickers::NUMERIC) * 100, 2)
    END as click_to_lead_rate,
    ci.scheduled_start_at as campaign_start,
    ci.end_time as campaign_end
  FROM send_stats ss
  CROSS JOIN click_stats cs
  CROSS JOIN lead_stats ls
  CROSS JOIN campaign_info ci;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on function
GRANT EXECUTE ON FUNCTION get_campaign_reporting_stats(UUID) TO service_role;

-- ============================================================================
-- Reporting Function: Get Lead Breakdown by Box Type
-- ============================================================================

CREATE OR REPLACE FUNCTION get_campaign_leads_by_box_type(p_campaign_id UUID)
RETURNS TABLE (
  box_type TEXT,
  lead_count BIGINT,
  revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.box_type::TEXT,
    COUNT(*)::BIGINT as lead_count,
    COALESCE(SUM(p.final_price_eur), 0)::NUMERIC as revenue
  FROM preorders p
  WHERE p.marketing_campaign_id = p_campaign_id
  GROUP BY p.box_type
  ORDER BY lead_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_campaign_leads_by_box_type(UUID) TO service_role;

-- ============================================================================
-- Reporting Function: Get Lead Breakdown by Promo Usage
-- ============================================================================

CREATE OR REPLACE FUNCTION get_campaign_leads_by_promo(p_campaign_id UUID)
RETURNS TABLE (
  has_promo BOOLEAN,
  lead_count BIGINT,
  revenue NUMERIC,
  avg_discount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (p.promo_code IS NOT NULL) as has_promo,
    COUNT(*)::BIGINT as lead_count,
    COALESCE(SUM(p.final_price_eur), 0)::NUMERIC as revenue,
    COALESCE(AVG(p.discount_percent), 0)::NUMERIC as avg_discount
  FROM preorders p
  WHERE p.marketing_campaign_id = p_campaign_id
  GROUP BY (p.promo_code IS NOT NULL)
  ORDER BY has_promo DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_campaign_leads_by_promo(UUID) TO service_role;

-- ============================================================================
-- Function: Get Non-Converted Recipients for Follow-Up
-- ============================================================================

CREATE OR REPLACE FUNCTION get_non_converted_recipients(
  p_parent_campaign_id UUID,
  p_window_hours INTEGER DEFAULT 48,
  p_follow_up_campaign_id UUID DEFAULT NULL
)
RETURNS TABLE (
  recipient_id UUID,
  email TEXT,
  name TEXT
) AS $$
DECLARE
  v_campaign_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
BEGIN
  -- Get campaign start time
  SELECT scheduled_start_at INTO v_campaign_start
  FROM marketing_campaigns
  WHERE id = p_parent_campaign_id;
  
  -- Calculate window end
  v_window_end := COALESCE(v_campaign_start, NOW()) + (p_window_hours || ' hours')::INTERVAL;
  
  RETURN QUERY
  SELECT DISTINCT 
    ms.recipient_id,
    ms.email,
    mr.name
  FROM marketing_sends ms
  JOIN marketing_recipients mr ON mr.id = ms.recipient_id
  WHERE ms.campaign_id = p_parent_campaign_id
    AND ms.status = 'sent'
    AND mr.subscribed = true
    -- Exclude recipients who converted (have a preorder attributed to parent campaign)
    AND NOT EXISTS (
      SELECT 1 FROM preorders p
      WHERE p.marketing_campaign_id = p_parent_campaign_id
        AND p.marketing_recipient_id = ms.recipient_id
        AND p.created_at <= v_window_end
    )
    -- Exclude recipients already in follow-up campaign (if specified)
    AND (
      p_follow_up_campaign_id IS NULL 
      OR NOT EXISTS (
        SELECT 1 FROM marketing_sends fs
        WHERE fs.campaign_id = p_follow_up_campaign_id
          AND fs.recipient_id = ms.recipient_id
      )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_non_converted_recipients(UUID, INTEGER, UUID) TO service_role;

-- ============================================================================
-- Function: Count Non-Converted Recipients
-- ============================================================================

CREATE OR REPLACE FUNCTION count_non_converted_recipients(
  p_parent_campaign_id UUID,
  p_window_hours INTEGER DEFAULT 48
)
RETURNS BIGINT AS $$
DECLARE
  v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM get_non_converted_recipients(p_parent_campaign_id, p_window_hours, NULL);
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION count_non_converted_recipients(UUID, INTEGER) TO service_role;

-- ============================================================================
-- Function: Get Follow-Up Campaigns for Parent
-- ============================================================================

CREATE OR REPLACE FUNCTION get_follow_up_campaigns(p_parent_campaign_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  status campaign_status,
  campaign_type campaign_type,
  follow_up_window_hours INTEGER,
  sent_count INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mc.id,
    mc.name,
    mc.status,
    mc.campaign_type,
    mc.follow_up_window_hours,
    mc.sent_count,
    mc.created_at
  FROM marketing_campaigns mc
  WHERE mc.parent_campaign_id = p_parent_campaign_id
  ORDER BY mc.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_follow_up_campaigns(UUID) TO service_role;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN marketing_campaigns.parent_campaign_id IS 'Reference to parent campaign for follow-up campaigns';
COMMENT ON COLUMN marketing_campaigns.campaign_type IS 'Type of campaign: primary or follow_up';
COMMENT ON COLUMN marketing_campaigns.follow_up_window_hours IS 'Time window in hours to check for conversions before follow-up';

COMMENT ON FUNCTION get_campaign_reporting_stats(UUID) IS 'Get comprehensive reporting stats for a campaign including sends, clicks, leads, and conversion rates';
COMMENT ON FUNCTION get_campaign_leads_by_box_type(UUID) IS 'Get lead breakdown by box type for a campaign';
COMMENT ON FUNCTION get_campaign_leads_by_promo(UUID) IS 'Get lead breakdown by promo code usage for a campaign';
COMMENT ON FUNCTION get_non_converted_recipients(UUID, INTEGER, UUID) IS 'Get recipients who were sent the campaign but did not convert within the window';
COMMENT ON FUNCTION count_non_converted_recipients(UUID, INTEGER) IS 'Count recipients who were sent the campaign but did not convert';
COMMENT ON FUNCTION get_follow_up_campaigns(UUID) IS 'Get all follow-up campaigns for a parent campaign';
