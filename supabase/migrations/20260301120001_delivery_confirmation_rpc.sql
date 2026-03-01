-- ============================================================================
-- Postgres function: get_orders_needing_delivery_action
--
-- Returns shipped orders that need a delivery confirmation reminder
-- or auto-confirmation, along with their current reminder state.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_orders_needing_delivery_action(delay_days INT)
RETURNS TABLE (
  order_id UUID,
  reminder_count INT,
  last_sent_at TIMESTAMPTZ
) LANGUAGE sql STABLE AS $$
  SELECT
    o.id AS order_id,
    COALESCE(r.cnt, 0)::INT AS reminder_count,
    r.last_sent_at
  FROM orders o
  LEFT JOIN (
    SELECT order_id, COUNT(*) AS cnt, MAX(sent_at) AS last_sent_at
    FROM delivery_confirmation_reminders
    GROUP BY order_id
  ) r ON r.order_id = o.id
  WHERE o.status = 'shipped'
    AND o.shipped_at IS NOT NULL
    AND (
      -- No reminders yet AND shipped_at + delay_days has passed
      (r.cnt IS NULL AND o.shipped_at + INTERVAL '1 day' * delay_days <= NOW())
      OR
      -- Has reminders but not yet 3, and 2 days since last reminder
      (r.cnt > 0 AND r.cnt < 3 AND r.last_sent_at + INTERVAL '2 days' <= NOW())
      OR
      -- Has 3 reminders and 2 days since last → eligible for auto-confirm
      (r.cnt >= 3 AND r.last_sent_at + INTERVAL '2 days' <= NOW())
    )
  ORDER BY o.shipped_at ASC
  LIMIT 100;
$$;
