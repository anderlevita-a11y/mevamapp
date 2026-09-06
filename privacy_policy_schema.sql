-- Enable extra security for privacy tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_policy_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_policy_accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cookie_consent_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cookie_consent_at TIMESTAMP WITH TIME ZONE;

-- Create an audit log for privacy consent changes (Legal Audit Trail)
CREATE TABLE IF NOT EXISTS privacy_consent_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL, -- 'privacy_policy', 'cookies', etc.
  action TEXT NOT NULL, -- 'accept', 'decline', 'revoke'
  ip_address TEXT, -- Optional, for legal proof
  user_agent TEXT, -- Optional, for legal proof
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for the log
ALTER TABLE privacy_consent_log ENABLE ROW LEVEL SECURITY;

-- Only the user themselves can see their consent history
CREATE POLICY "Users can view their own consent log" 
  ON privacy_consent_log FOR SELECT 
  USING (auth.uid() = user_id);

-- Anyone authenticated can create a log entry for themselves
CREATE POLICY "Users can insert their own consent logs" 
  ON privacy_consent_log FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Visit tracking for Pastor's Dashboard (Anonymized)
CREATE TABLE IF NOT EXISTS page_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_name TEXT NOT NULL,
  visit_date DATE DEFAULT CURRENT_DATE,
  count INTEGER DEFAULT 1,
  UNIQUE(page_name, visit_date)
);

-- Counting is done exclusively through increment_page_visit() (SECURITY DEFINER
-- below), which bypasses RLS as the table owner. No public write policy is
-- needed on the table itself, and none is granted here. Only admins can read.
ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view visits" ON page_visits FOR SELECT TO authenticated USING (public.is_admin());

-- Atomic Increment Function (Idempotent operation)
-- SECURITY DEFINER so it can write to page_visits without needing a public
-- INSERT/UPDATE policy on the table (RLS above only grants admin SELECT).
CREATE OR REPLACE FUNCTION increment_page_visit(p_page_name TEXT, p_visit_date DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO page_visits (page_name, visit_date, count)
  VALUES (p_page_name, p_visit_date, 1)
  ON CONFLICT (page_name, visit_date)
  DO UPDATE SET count = page_visits.count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Rate Limiting System (Postgres-based)
CREATE TABLE IF NOT EXISTS action_rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID, -- NULL for anonymous
  action_key TEXT NOT NULL,
  last_request TIMESTAMPTZ DEFAULT NOW(),
  request_count INTEGER DEFAULT 1,
  UNIQUE(user_id, action_key)
);

CREATE OR REPLACE FUNCTION check_rate_limit(p_action_key TEXT, p_limit INTEGER, p_window_seconds INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_count INTEGER;
  v_last TIMESTAMPTZ;
BEGIN
  -- Cleanup/Fetch current state
  SELECT request_count, last_request INTO v_count, v_last
  FROM action_rate_limits
  WHERE user_id = auth.uid() AND action_key = p_action_key;

  IF NOT FOUND THEN
    INSERT INTO action_rate_limits (user_id, action_key, last_request, request_count)
    VALUES (auth.uid(), p_action_key, v_now, 1);
    RETURN TRUE;
  END IF;

  -- If the window has passed, reset the counter
  IF v_now > v_last + (p_window_seconds || ' seconds')::INTERVAL THEN
    UPDATE action_rate_limits
    SET request_count = 1, last_request = v_now
    WHERE user_id = auth.uid() AND action_key = p_action_key;
    RETURN TRUE;
  END IF;

  -- Check if limit reached
  IF v_count < p_limit THEN
    UPDATE action_rate_limits
    SET request_count = v_count + 1
    WHERE user_id = auth.uid() AND action_key = p_action_key;
    RETURN TRUE;
  END IF;

  RETURN FALSE; -- Limit exceeded
END;
$$ LANGUAGE plpgsql;

