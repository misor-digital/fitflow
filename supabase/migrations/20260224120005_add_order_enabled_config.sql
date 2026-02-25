-- ============================================================================
-- Add ORDER_ENABLED site config
-- ============================================================================

INSERT INTO site_config (key, value, description, value_type)
VALUES ('ORDER_ENABLED', 'true', 'Whether the order flow is active', 'boolean')
ON CONFLICT (key) DO NOTHING;

-- Update PREORDER_ENABLED to false (preorders are being shut down)
UPDATE site_config
SET value = 'false', description = 'DEPRECATED — preorder flow is shut down, replaced by order flow'
WHERE key = 'PREORDER_ENABLED';
