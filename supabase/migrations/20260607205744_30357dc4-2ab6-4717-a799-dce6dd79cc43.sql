
-- Add UTM/attribution columns to b2b_leads
ALTER TABLE public.b2b_leads
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS gclid text,
  ADD COLUMN IF NOT EXISTS fbclid text,
  ADD COLUMN IF NOT EXISTS referrer text;

-- analytics_events: add user_agent column for server-side events
ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS user_agent text;

-- Server-side conversion events table (append-only)
CREATE TABLE IF NOT EXISTS public.conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  user_id uuid,
  email text,
  business_account_id uuid,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  utm jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.conversion_events TO authenticated;
GRANT ALL ON public.conversion_events TO service_role;

ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read conversion_events"
  ON public.conversion_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_conversion_events_event_name ON public.conversion_events(event_name);
CREATE INDEX IF NOT EXISTS idx_conversion_events_created_at ON public.conversion_events(created_at DESC);
