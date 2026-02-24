-- ============================================================================
-- GDPR: Add email consent tracking to preorders
-- ============================================================================
-- Legacy preorders were collected before the email campaign system existed.
-- This column tracks whether the preorder holder has consented to marketing emails.

ALTER TABLE preorders
  ADD COLUMN email_consent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN email_consent_at TIMESTAMPTZ;

COMMENT ON COLUMN preorders.email_consent IS 'Whether the preorder holder has consented to receiving marketing emails (GDPR)';
COMMENT ON COLUMN preorders.email_consent_at IS 'Timestamp when email consent was granted';
