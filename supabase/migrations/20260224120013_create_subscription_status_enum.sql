-- ============================================================================
-- Subscription Status Enum
-- ============================================================================

CREATE TYPE subscription_status AS ENUM ('active', 'paused', 'cancelled', 'expired');

COMMENT ON TYPE subscription_status IS 'Lifecycle states for a subscription: active (receiving boxes), paused (temporarily stopped), cancelled (permanently stopped), expired (ran out / admin terminated)';
