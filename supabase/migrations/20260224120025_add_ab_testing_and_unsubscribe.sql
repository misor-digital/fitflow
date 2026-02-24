-- Migration: Add A/B testing variants and unsubscribe tracking
-- Phase E9 — Advanced Campaign Features

-- ============================================================================
-- A/B test variants table
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_ab_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  variant_label TEXT NOT NULL DEFAULT 'A',
  subject TEXT,
  template_id INTEGER,
  params JSONB DEFAULT '{}',
  recipient_percentage INTEGER NOT NULL DEFAULT 50,
  sent_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  opened_count INTEGER NOT NULL DEFAULT 0,
  clicked_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Add variant_id to recipients
-- ============================================================================

ALTER TABLE email_campaign_recipients
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES email_ab_variants(id) ON DELETE SET NULL;

-- ============================================================================
-- Unsubscribe tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'brevo',
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
  reason TEXT,
  unsubscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_email
  ON email_unsubscribes (email);

-- ============================================================================
-- RLS policies
-- ============================================================================

ALTER TABLE email_ab_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on email_ab_variants"
  ON email_ab_variants FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on email_unsubscribes"
  ON email_unsubscribes FOR ALL USING (true) WITH CHECK (true);
