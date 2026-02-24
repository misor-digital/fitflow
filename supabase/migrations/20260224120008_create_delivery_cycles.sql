-- ============================================================================
-- Delivery Cycles Table
-- ============================================================================

CREATE TABLE delivery_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_date DATE NOT NULL UNIQUE,
  status delivery_cycle_status NOT NULL DEFAULT 'upcoming',
  title TEXT,
  description TEXT,
  is_revealed BOOLEAN NOT NULL DEFAULT false,
  revealed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE delivery_cycles IS 'Monthly delivery cycles — each row represents one box shipment date';
COMMENT ON COLUMN delivery_cycles.delivery_date IS 'The date this cycle ships (e.g. 2026-03-08)';
COMMENT ON COLUMN delivery_cycles.status IS 'Lifecycle state: upcoming, delivered, archived';
COMMENT ON COLUMN delivery_cycles.title IS 'Display name (e.g. "Март 2026 кутия")';
COMMENT ON COLUMN delivery_cycles.description IS 'Rich text for the revealed-box public page';
COMMENT ON COLUMN delivery_cycles.is_revealed IS 'Whether box contents are publicly visible';
COMMENT ON COLUMN delivery_cycles.revealed_at IS 'When admin revealed the contents';

-- Indexes
CREATE INDEX idx_delivery_cycles_upcoming ON delivery_cycles(delivery_date)
  WHERE status = 'upcoming';
CREATE INDEX idx_delivery_cycles_revealed ON delivery_cycles(delivery_date DESC)
  WHERE is_revealed = true;
CREATE INDEX idx_delivery_cycles_status ON delivery_cycles(status);

-- Trigger: auto-update updated_at
CREATE TRIGGER trigger_delivery_cycles_updated_at
  BEFORE UPDATE ON delivery_cycles FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE delivery_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery_cycles_anon_read" ON delivery_cycles
  FOR SELECT TO anon USING (true);

CREATE POLICY "delivery_cycles_auth_read" ON delivery_cycles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "delivery_cycles_service_role" ON delivery_cycles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Grants
GRANT SELECT ON delivery_cycles TO anon;
GRANT SELECT ON delivery_cycles TO authenticated;
GRANT ALL ON delivery_cycles TO service_role;
