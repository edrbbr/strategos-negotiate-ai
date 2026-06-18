
-- 1) linkedin_pool: remove public row policy, expose safe columns via view
DROP POLICY IF EXISTS "Public can view posted linkedin entries" ON public.linkedin_pool;

CREATE OR REPLACE VIEW public.linkedin_pool_public
WITH (security_invoker = false) AS
SELECT id, post_title, generated_post, post_url, posted_at
FROM public.linkedin_pool
WHERE status = 'posted';

REVOKE ALL ON public.linkedin_pool_public FROM PUBLIC;
GRANT SELECT ON public.linkedin_pool_public TO anon, authenticated;

-- 2) linkedin_templates: restrict SELECT policy to authenticated role only
DROP POLICY IF EXISTS "Templates viewable by authenticated" ON public.linkedin_templates;
CREATE POLICY "Templates viewable by authenticated"
  ON public.linkedin_templates FOR SELECT
  TO authenticated
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));
