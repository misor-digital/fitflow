-- Add cutoff widget toggle settings to site_config
INSERT INTO site_config (key, value, description, value_type)
VALUES
  ('CUTOFF_WIDGETS_ENABLED', 'true', 'Master toggle for cutoff banner and popup widgets', 'boolean'),
  ('CUTOFF_BANNER_ENABLED', 'true', 'Toggle for the sliding cutoff banner at the top of the page', 'boolean'),
  ('CUTOFF_POPUP_ENABLED', 'true', 'Toggle for the floating countdown popup on homepage and order page', 'boolean')
ON CONFLICT (key) DO NOTHING;
