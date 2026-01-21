-- Migration: Update preorders table with audit fields
-- Purpose: Add IP address and user agent tracking for GDPR compliance
-- Part of Phase 1: Minimal Safe Foundation

-- Add audit fields to preorders table
ALTER TABLE preorders 
  ADD COLUMN IF NOT EXISTS ip_address INET,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

-- Create index for last_edited_at
CREATE INDEX IF NOT EXISTS idx_preorders_last_edited_at ON preorders(last_edited_at);

-- Add comments for new columns
COMMENT ON COLUMN preorders.ip_address IS 'IP address of the user who created the preorder';
COMMENT ON COLUMN preorders.user_agent IS 'User agent string of the browser used';
COMMENT ON COLUMN preorders.last_edited_at IS 'Timestamp of the last edit via token';
COMMENT ON COLUMN preorders.edit_count IS 'Number of times preorder has been edited';

-- Create trigger to log preorder creation
CREATE OR REPLACE FUNCTION log_preorder_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Log preorder creation to audit_logs
  PERFORM create_audit_log(
    'anonymous'::actor_type,
    NULL,
    NEW.email,
    'preorder.created',
    'preorder',
    NEW.id,
    jsonb_build_object(
      'order_id', NEW.order_id,
      'box_type', NEW.box_type,
      'wants_personalization', NEW.wants_personalization,
      'final_price_eur', NEW.final_price_eur
    ),
    NEW.ip_address,
    NEW.user_agent
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_preorder_creation_trigger ON preorders;
CREATE TRIGGER log_preorder_creation_trigger
  AFTER INSERT ON preorders
  FOR EACH ROW
  EXECUTE FUNCTION log_preorder_creation();

-- Create trigger to log preorder updates
CREATE OR REPLACE FUNCTION log_preorder_update()
RETURNS TRIGGER AS $$
DECLARE
  v_changes JSONB;
BEGIN
  -- Build a JSONB object of changed fields
  v_changes := jsonb_build_object(
    'old', jsonb_build_object(
      'full_name', OLD.full_name,
      'email', OLD.email,
      'phone', OLD.phone,
      'box_type', OLD.box_type,
      'wants_personalization', OLD.wants_personalization
    ),
    'new', jsonb_build_object(
      'full_name', NEW.full_name,
      'email', NEW.email,
      'phone', NEW.phone,
      'box_type', NEW.box_type,
      'wants_personalization', NEW.wants_personalization
    )
  );
  
  -- Log preorder update to audit_logs
  PERFORM create_audit_log(
    'anonymous'::actor_type,
    NULL,
    NEW.email,
    'preorder.updated',
    'preorder',
    NEW.id,
    v_changes,
    NEW.ip_address,
    NEW.user_agent
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_preorder_update_trigger ON preorders;
CREATE TRIGGER log_preorder_update_trigger
  AFTER UPDATE ON preorders
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION log_preorder_update();

COMMENT ON FUNCTION log_preorder_creation IS 'Logs preorder creation to audit_logs';
COMMENT ON FUNCTION log_preorder_update IS 'Logs preorder updates to audit_logs';
