
-- Add title, URL, refinement history to linkedin_pool
ALTER TABLE public.linkedin_pool
  ADD COLUMN IF NOT EXISTS post_title text,
  ADD COLUMN IF NOT EXISTS post_url text,
  ADD COLUMN IF NOT EXISTS refinement_history jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Public read of posted entries (for /insights and homepage teaser)
DROP POLICY IF EXISTS "Public can view posted linkedin entries" ON public.linkedin_pool;
CREATE POLICY "Public can view posted linkedin entries"
  ON public.linkedin_pool FOR SELECT
  TO anon, authenticated
  USING (status = 'posted');

GRANT SELECT ON public.linkedin_pool TO anon;

-- Admin SELECT on cases (needed for content curator to show raw situation)
DROP POLICY IF EXISTS "Admins can view all cases" ON public.cases;
CREATE POLICY "Admins can view all cases"
  ON public.cases FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
