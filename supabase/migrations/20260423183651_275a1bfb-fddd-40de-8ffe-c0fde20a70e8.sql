-- =====================================================
-- 1) Hide internal AI config from public plans reads
-- =====================================================

-- Revoke direct table SELECT from anon/authenticated; we'll expose a safe view instead.
REVOKE SELECT ON public.plans FROM anon, authenticated;

-- Drop the broad public SELECT policy (table-level grant is gone, but keep things tidy).
DROP POLICY IF EXISTS "Plans are viewable by everyone" ON public.plans;

-- Re-add a policy so the view (security_invoker) can read rows on behalf of callers.
CREATE POLICY "Plans are viewable by everyone"
  ON public.plans
  FOR SELECT
  USING (is_active = true);

-- Public-safe view: excludes pipeline_config and model_id (internal routing details).
CREATE OR REPLACE VIEW public.plans_public
WITH (security_invoker = true) AS
SELECT
  id,
  tier_label,
  name,
  tagline,
  badge,
  case_limit,
  case_limit_type,
  is_recommended,
  sort_order,
  is_active,
  created_at,
  updated_at
FROM public.plans
WHERE is_active = true;

GRANT SELECT ON public.plans_public TO anon, authenticated;

-- =====================================================
-- 2) Realtime channel authorization
-- =====================================================
-- Scope channel topics to the owning user. Topics used by the app:
--   case-versions:<case_id>:<rand>   (useCaseVersions)
--   cases:<user_id>...               (if any future per-user channel)
-- We authorize by checking the case ownership embedded in the topic.

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own case realtime" ON realtime.messages;
CREATE POLICY "Users can read own case realtime"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cases c
      WHERE c.user_id = auth.uid()
        AND (
          realtime.topic() = 'case-versions:' || c.id::text
          OR realtime.topic() LIKE 'case-versions:' || c.id::text || ':%'
          OR realtime.topic() = 'cases:' || c.id::text
          OR realtime.topic() LIKE 'cases:' || c.id::text || ':%'
        )
    )
  );

DROP POLICY IF EXISTS "Users can send own case realtime" ON realtime.messages;
CREATE POLICY "Users can send own case realtime"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.cases c
      WHERE c.user_id = auth.uid()
        AND (
          realtime.topic() = 'case-versions:' || c.id::text
          OR realtime.topic() LIKE 'case-versions:' || c.id::text || ':%'
          OR realtime.topic() = 'cases:' || c.id::text
          OR realtime.topic() LIKE 'cases:' || c.id::text || ':%'
        )
    )
  );
