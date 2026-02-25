-- ============================================================================
-- Email Campaign System — Enums
-- ============================================================================

-- Campaign types
CREATE TYPE email_campaign_type AS ENUM (
  'one-off',
  'preorder-conversion',
  'promotional',
  'lifecycle'
);
COMMENT ON TYPE email_campaign_type IS 'Types of email campaigns: one-off (manual), preorder-conversion (token-based), promotional (marketing), lifecycle (event-triggered)';

-- Campaign lifecycle status
CREATE TYPE email_campaign_status AS ENUM (
  'draft',
  'scheduled',
  'sending',
  'sent',
  'paused',
  'cancelled',
  'failed'
);
COMMENT ON TYPE email_campaign_status IS 'Lifecycle states for an email campaign';

-- Per-recipient delivery status
CREATE TYPE email_recipient_status AS ENUM (
  'pending',
  'sent',
  'delivered',
  'opened',
  'clicked',
  'bounced',
  'failed',
  'skipped'
);
COMMENT ON TYPE email_recipient_status IS 'Delivery status for individual campaign recipients, updated via Brevo webhooks';

-- Unified email log status (transactional + campaign)
CREATE TYPE email_log_status AS ENUM (
  'sent',
  'delivered',
  'opened',
  'clicked',
  'bounced',
  'failed'
);
COMMENT ON TYPE email_log_status IS 'Status for all email sends — both transactional and campaign';

-- Target audience type
CREATE TYPE target_list_type AS ENUM (
  'preorder-holders',
  'subscribers',
  'all-customers',
  'custom-list'
);
COMMENT ON TYPE target_list_type IS 'Audience targeting categories for email campaigns';
