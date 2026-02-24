-- Remove auto-trigger — status history is managed explicitly by the application DAL.
-- This avoids duplicate entries and allows setting changed_by and notes.
DROP TRIGGER IF EXISTS trigger_log_order_status_change ON orders;
DROP FUNCTION IF EXISTS log_order_status_change();
