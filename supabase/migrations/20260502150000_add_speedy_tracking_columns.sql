-- Add tracking metadata columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS speedy_status_code INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS speedy_last_tracked_at TIMESTAMPTZ;
