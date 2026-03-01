-- Atomic increment for email_campaigns sent/failed counters.
-- Prevents the read-then-write race condition when multiple
-- workers process recipients concurrently.

CREATE OR REPLACE FUNCTION public.increment_campaign_counters(
  p_campaign_id UUID,
  p_sent_delta  INT DEFAULT 0,
  p_failed_delta INT DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE email_campaigns
  SET
    sent_count   = sent_count   + p_sent_delta,
    failed_count = failed_count + p_failed_delta
  WHERE id = p_campaign_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign % not found', p_campaign_id;
  END IF;
END;
$$;
