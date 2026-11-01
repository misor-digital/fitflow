-- ============================================================================
-- Speedy courier pickup requests
-- ============================================================================
CREATE TABLE speedy_pickup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','requested','failed')),
  delivery_cycle_id UUID REFERENCES delivery_cycles(id) ON DELETE SET NULL,
  speedy_order_ids BIGINT[],
  pickup_date DATE NOT NULL,
  visit_end_time TEXT NOT NULL CHECK (visit_end_time ~ '^([01]?\d|2[0-3]):[0-5]\d$'),
  contact_name TEXT,
  phone_number TEXT,
  pickup_period_from TIMESTAMPTZ,
  pickup_period_to TIMESTAMPTZ,
  shipment_count INTEGER NOT NULL DEFAULT 0,
  visit_fee_eur NUMERIC(6,2),
  error_message TEXT,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE speedy_pickup_requests IS 'Courier pickup requests sent to Speedy (POST /pickup)';

CREATE TRIGGER trigger_speedy_pickup_requests_updated_at
  BEFORE UPDATE ON speedy_pickup_requests FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE speedy_pickup_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY speedy_pickup_requests_service ON speedy_pickup_requests
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE orders
  ADD COLUMN speedy_sender_mode TEXT CHECK (speedy_sender_mode IN ('pickup','dropoff')),
  ADD COLUMN speedy_pickup_request_id UUID REFERENCES speedy_pickup_requests(id) ON DELETE SET NULL,
  ADD COLUMN speedy_pickup_requested_at TIMESTAMPTZ;
COMMENT ON COLUMN orders.speedy_sender_mode IS 'How the parcel reaches Speedy: pickup (courier collects from sender address) or dropoff (sender drops at office)';
COMMENT ON COLUMN orders.speedy_pickup_request_id IS 'Pickup request that includes this waybill; once set the waybill can no longer be cancelled via API';
CREATE INDEX idx_orders_speedy_pickup_request ON orders(speedy_pickup_request_id) WHERE speedy_pickup_request_id IS NOT NULL;

-- All waybills created before this migration used office drop-off
UPDATE orders SET speedy_sender_mode = 'dropoff' WHERE speedy_waybill_id IS NOT NULL;

INSERT INTO site_config (key, value) VALUES
  ('SPEEDY_SENDER_MODE', 'pickup'),
  ('SPEEDY_PICKUP_VISIT_END_TIME', '17:00')
ON CONFLICT (key) DO NOTHING;
