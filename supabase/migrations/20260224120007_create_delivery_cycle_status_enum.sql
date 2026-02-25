-- ============================================================================
-- Delivery Cycle Status Enum
-- ============================================================================

CREATE TYPE delivery_cycle_status AS ENUM ('upcoming', 'delivered', 'archived');

COMMENT ON TYPE delivery_cycle_status IS 'Lifecycle states for a delivery cycle: upcoming (not yet shipped), delivered (shipped, may or may not be revealed), archived (past, no longer relevant)';
