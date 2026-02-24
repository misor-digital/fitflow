-- ============================================================================
-- Delivery Cycle Items Table (contents of each box)
-- ============================================================================

CREATE TABLE delivery_cycle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_cycle_id UUID NOT NULL REFERENCES delivery_cycles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  category TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE delivery_cycle_items IS 'Contents of each delivery cycle box — revealed publicly after delivery';
COMMENT ON COLUMN delivery_cycle_items.delivery_cycle_id IS 'FK to delivery_cycles — cascade deletes items when cycle is removed';
COMMENT ON COLUMN delivery_cycle_items.name IS 'Item display name (e.g. "Whey Protein 500g")';
COMMENT ON COLUMN delivery_cycle_items.description IS 'Item description';
COMMENT ON COLUMN delivery_cycle_items.image_url IS 'Path in Supabase Storage (e.g. box-contents/march-2026/protein.jpg)';
COMMENT ON COLUMN delivery_cycle_items.category IS 'Item category: protein, supplement, accessory, clothing, other';
COMMENT ON COLUMN delivery_cycle_items.sort_order IS 'Display order within the cycle';

-- Indexes
CREATE INDEX idx_cycle_items_cycle ON delivery_cycle_items(delivery_cycle_id, sort_order);

-- Trigger: auto-update updated_at
CREATE TRIGGER trigger_delivery_cycle_items_updated_at
  BEFORE UPDATE ON delivery_cycle_items FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE delivery_cycle_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cycle_items_anon_read" ON delivery_cycle_items
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM delivery_cycles dc
      WHERE dc.id = delivery_cycle_items.delivery_cycle_id
      AND dc.is_revealed = true
    )
  );

CREATE POLICY "cycle_items_auth_read" ON delivery_cycle_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_cycles dc
      WHERE dc.id = delivery_cycle_items.delivery_cycle_id
      AND dc.is_revealed = true
    )
  );

CREATE POLICY "cycle_items_service_role" ON delivery_cycle_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Grants
GRANT SELECT ON delivery_cycle_items TO anon;
GRANT SELECT ON delivery_cycle_items TO authenticated;
GRANT ALL ON delivery_cycle_items TO service_role;
