
-- 1. Tighten analytics_events INSERT policy: forbid anonymous inserts that set arbitrary user_id
DROP POLICY IF EXISTS "Anyone can insert events" ON public.analytics_events;
CREATE POLICY "Anyone can insert events"
  ON public.analytics_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR (auth.uid() IS NOT NULL AND (user_id IS NULL OR auth.uid() = user_id))
  );

-- 2. Lock down SECURITY DEFINER functions: revoke broad EXECUTE and re-grant only where needed.
-- Functions only invoked via service_role (edge functions) or internal triggers:
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public.consume_dossier(uuid)',
    'public.consume_refinement(uuid, uuid)',
    'public.increment_cases_used(uuid)',
    'public.sync_profile_from_subscription()',
    'public.handle_new_user()',
    'public.create_default_business_settings()',
    'public.business_custom_roles_guard()',
    'public.move_to_dlq(text, text, bigint, jsonb)',
    'public.delete_email(text, bigint)',
    'public.enqueue_email(text, jsonb)',
    'public.read_email_batch(text, integer, integer)',
    'public.match_knowledge(vector, integer, text[])',
    'public.match_business_knowledge(uuid, vector, integer)',
    'public.effective_discount_limit(uuid, uuid)',
    'public.update_updated_at_column()'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;

-- Functions invoked via RLS policies or by authenticated clients keep authenticated EXECUTE,
-- but anon EXECUTE is revoked where not needed.
REVOKE ALL ON FUNCTION public.is_business_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_business_member(uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.can_manage_roles(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_roles(uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.business_role_rank(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.business_role_rank(uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_user_business_account(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_business_account(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.generate_business_case_number(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_business_case_number(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.validate_discount_code(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_discount_code(uuid, text, text, text) TO authenticated, service_role;

-- has_role is referenced from policies on tables that allow anon access (e.g. analytics_events admin select),
-- so anon needs EXECUTE for policy evaluation to short-circuit cleanly.
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated, service_role;
