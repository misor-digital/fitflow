-- Migration: Add customer_user_id to preorders
-- Purpose: Link preorders to authenticated customer accounts
-- Part of Phase 3: Customer Auth + Customer Portal

-- Add customer_user_id column to preorders table
ALTER TABLE preorders
ADD COLUMN IF NOT EXISTS customer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for fast lookups by customer
CREATE INDEX IF NOT EXISTS idx_preorders_customer_user_id ON preorders(customer_user_id);

-- Add comment
COMMENT ON COLUMN preorders.customer_user_id IS 'FK to auth.users.id - links preorder to authenticated customer account (nullable for anonymous preorders)';

-- Update RLS policies for customer access

-- Policy: Authenticated customers can read their own preorders
DROP POLICY IF EXISTS "Customers can read own preorders" ON preorders;
CREATE POLICY "Customers can read own preorders" ON preorders
  FOR SELECT
  TO authenticated
  USING (customer_user_id = auth.uid());

-- Policy: Authenticated customers can update their own preorders (for claiming)
DROP POLICY IF EXISTS "Customers can update own preorders" ON preorders;
CREATE POLICY "Customers can update own preorders" ON preorders
  FOR UPDATE
  TO authenticated
  USING (customer_user_id = auth.uid())
  WITH CHECK (customer_user_id = auth.uid());

-- Grant permissions
GRANT SELECT, UPDATE ON preorders TO authenticated;

-- Create function to claim preorder by email
-- This allows customers to link existing anonymous preorders to their account
CREATE OR REPLACE FUNCTION claim_preorder_by_email(
  p_preorder_id UUID,
  p_email TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_preorder_email TEXT;
  v_existing_customer_user_id UUID;
BEGIN
  -- Get the preorder's email and current customer_user_id
  SELECT email, customer_user_id
  INTO v_preorder_email, v_existing_customer_user_id
  FROM preorders
  WHERE id = p_preorder_id;
  
  -- Check if preorder exists
  IF v_preorder_email IS NULL THEN
    RAISE EXCEPTION 'Preorder not found';
  END IF;
  
  -- Check if preorder is already claimed by another user
  IF v_existing_customer_user_id IS NOT NULL AND v_existing_customer_user_id != p_user_id THEN
    RAISE EXCEPTION 'Preorder already claimed by another user';
  END IF;
  
  -- Check if emails match (case-insensitive)
  IF LOWER(v_preorder_email) != LOWER(p_email) THEN
    RAISE EXCEPTION 'Email does not match preorder';
  END IF;
  
  -- Claim the preorder
  UPDATE preorders
  SET customer_user_id = p_user_id,
      updated_at = NOW()
  WHERE id = p_preorder_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on claim function
GRANT EXECUTE ON FUNCTION claim_preorder_by_email TO authenticated;

COMMENT ON FUNCTION claim_preorder_by_email IS 'Allows authenticated customers to claim preorders made with their email address';

-- Create audit log trigger for preorder claiming
CREATE OR REPLACE FUNCTION log_preorder_claim()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if customer_user_id changed from NULL to a value
  IF OLD.customer_user_id IS NULL AND NEW.customer_user_id IS NOT NULL THEN
    PERFORM create_audit_log(
      'customer'::actor_type,
      NEW.customer_user_id,
      (SELECT email FROM auth.users WHERE id = NEW.customer_user_id),
      'preorder.claimed',
      'preorder',
      NEW.id,
      jsonb_build_object(
        'order_id', NEW.order_id,
        'email', NEW.email
      ),
      NULL,
      NULL
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_preorder_claim_trigger ON preorders;
CREATE TRIGGER log_preorder_claim_trigger
  AFTER UPDATE ON preorders
  FOR EACH ROW
  WHEN (OLD.customer_user_id IS DISTINCT FROM NEW.customer_user_id)
  EXECUTE FUNCTION log_preorder_claim();

COMMENT ON FUNCTION log_preorder_claim IS 'Logs when a customer claims a preorder';
