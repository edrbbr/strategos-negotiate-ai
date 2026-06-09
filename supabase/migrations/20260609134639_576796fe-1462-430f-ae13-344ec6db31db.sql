
-- 1) Lock down conversion_events writes to service_role only (explicit deny for clients)
CREATE POLICY "Deny client inserts on conversion_events"
  ON public.conversion_events
  AS RESTRICTIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

-- 2) Tighten plans: client uses plans_public view; lock raw plans to admins only
DROP POLICY IF EXISTS "Plans are viewable by everyone" ON public.plans;
CREATE POLICY "Admins can read plans"
  ON public.plans
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
REVOKE SELECT ON public.plans FROM anon;

-- 3) Create public-safe view for tonality_profiles excluding prompt_instruction;
--    restrict base table to admins.
CREATE OR REPLACE VIEW public.tonality_profiles_public
  WITH (security_invoker = true) AS
  SELECT key, label, description, min_tier, sort_order, is_active
  FROM public.tonality_profiles
  WHERE is_active = true;

GRANT SELECT ON public.tonality_profiles_public TO anon, authenticated;

DROP POLICY IF EXISTS "Tonality profiles viewable by everyone" ON public.tonality_profiles;
CREATE POLICY "Admins can read tonality_profiles"
  ON public.tonality_profiles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
REVOKE SELECT ON public.tonality_profiles FROM anon;
-- Edge functions use service_role and bypass RLS, so prompt_instruction remains
-- accessible server-side.
