-- ============================================================================
-- Order Status Enum
-- ============================================================================

CREATE TYPE order_status AS ENUM (
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
);

COMMENT ON TYPE order_status IS 'Lifecycle states for an order';
