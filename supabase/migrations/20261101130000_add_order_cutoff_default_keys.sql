-- ============================================================================
-- Configurable default order cutoff for new delivery cycles
--
-- Replaces the hardcoded "2 days before delivery at 14:00" pre-fill in the
-- create-cycle form. Times are Bulgarian (Europe/Sofia) wall time.
-- ============================================================================
INSERT INTO site_config (key, value, description, value_type)
VALUES
  ('ORDER_CUTOFF_DAYS_BEFORE', '2', 'Default order cutoff for new cycles: days before the delivery date', 'number'),
  ('ORDER_CUTOFF_TIME', '14:00', 'Default order cutoff for new cycles: time of day (HH:mm, Bulgarian time)', 'string')
ON CONFLICT (key) DO NOTHING;
