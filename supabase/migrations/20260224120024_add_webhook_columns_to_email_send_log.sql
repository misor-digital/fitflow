-- Migration: Add webhook tracking columns to email_send_log
-- Part of Phase E7 — Admin Email Dashboard & Webhooks

-- Add new status values for webhook events
ALTER TYPE email_log_status ADD VALUE IF NOT EXISTS 'spam';
ALTER TYPE email_log_status ADD VALUE IF NOT EXISTS 'blocked';

-- Add webhook tracking columns
ALTER TABLE email_send_log
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS webhook_events JSONB DEFAULT '[]'::jsonb;

-- Index for webhook lookups by brevo_message_id (already exists but ensure it's there)
CREATE INDEX IF NOT EXISTS idx_email_send_log_brevo_message_id
  ON email_send_log (brevo_message_id)
  WHERE brevo_message_id IS NOT NULL;

-- Index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_email_send_log_created_at
  ON email_send_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_send_log_email_type
  ON email_send_log (email_type);

CREATE INDEX IF NOT EXISTS idx_email_send_log_status
  ON email_send_log (status);
