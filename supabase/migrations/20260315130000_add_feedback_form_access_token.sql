-- ============================================================================
-- Add access_token to feedback_forms for restricted-access forms
-- Migration: 20260315130000_add_feedback_form_access_token
--
-- When access_token is NOT NULL, the form requires ?token=<value> in the URL.
-- This supports sending private feedback links to specific groups (e.g. box
-- recipients) via email campaigns.
-- ============================================================================

ALTER TABLE feedback_forms
  ADD COLUMN access_token TEXT DEFAULT NULL;

COMMENT ON COLUMN feedback_forms.access_token
  IS 'When set, the form requires ?token=<value> in the URL to be accessible. NULL means public.';

-- Partial index for token lookups
CREATE INDEX idx_feedback_forms_access_token
  ON feedback_forms(access_token)
  WHERE access_token IS NOT NULL;
