-- Add parcel configuration keys to site_config
INSERT INTO site_config (key, value) VALUES
  ('PARCEL_WEIGHT_KG', '2.5'),
  ('PARCEL_WIDTH_CM', '30'),
  ('PARCEL_DEPTH_CM', '30'),
  ('PARCEL_HEIGHT_CM', '15'),
  ('PARCEL_CONTENTS', 'Фитнес кутия')
ON CONFLICT (key) DO NOTHING;
