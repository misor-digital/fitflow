-- Add Speedy waybill tracking columns to orders
ALTER TABLE orders ADD COLUMN speedy_waybill_id TEXT;
ALTER TABLE orders ADD COLUMN speedy_parcel_ids TEXT[];
ALTER TABLE orders ADD COLUMN speedy_created_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN speedy_status TEXT;
