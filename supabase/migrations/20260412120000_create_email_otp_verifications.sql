-- Migration: Create email_otp_verifications table
-- Short-lived OTP codes for inline email verification during order flow.
-- Used for both registration and login via 6-digit codes.

CREATE TABLE IF NOT EXISTS email_otp_verifications (
  email       TEXT PRIMARY KEY,
  otp_hash    TEXT NOT NULL,
  attempts    SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);

-- Index for efficient cleanup of expired rows
CREATE INDEX idx_email_otp_expires ON email_otp_verifications (expires_at);

-- RLS: no client access, only service_role
ALTER TABLE email_otp_verifications ENABLE ROW LEVEL SECURITY;
-- No policies = no client access (service_role bypasses RLS)

COMMENT ON TABLE email_otp_verifications IS 'Short-lived OTP codes for inline email verification during order flow';
COMMENT ON COLUMN email_otp_verifications.otp_hash IS 'SHA-256 hash of the 6-digit OTP code';
COMMENT ON COLUMN email_otp_verifications.attempts IS 'Number of verification attempts (max 5 before invalidation)';
COMMENT ON COLUMN email_otp_verifications.expires_at IS 'OTP expiry timestamp (10 minutes after creation)';
