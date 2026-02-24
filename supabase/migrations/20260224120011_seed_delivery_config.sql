-- ============================================================================
-- Seed delivery schedule configuration
-- ============================================================================

-- Delivery schedule configuration
INSERT INTO site_config (key, value, description, value_type) VALUES
  ('SUBSCRIPTION_DELIVERY_DAY', '5', 'Day of month for recurring subscription box delivery (1-28)', 'number'),
  ('FIRST_DELIVERY_DATE', '2026-03-08', 'Override date for the very first delivery cycle (ISO format)', 'string'),
  ('SUBSCRIPTION_ENABLED', 'true', 'Master feature flag for the subscription system', 'boolean'),
  ('REVEALED_BOX_ENABLED', 'false', 'Whether the revealed (ASAP) one-time box is available — flip after first delivery', 'boolean')
ON CONFLICT (key) DO NOTHING;
