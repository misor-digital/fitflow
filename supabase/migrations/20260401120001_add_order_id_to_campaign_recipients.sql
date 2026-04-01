-- Add order_id to email_campaign_recipients for order-to-subscription conversion campaigns
-- Existing preorder_id column stays as-is (backward compatible)
ALTER TABLE email_campaign_recipients
  ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE CASCADE;
