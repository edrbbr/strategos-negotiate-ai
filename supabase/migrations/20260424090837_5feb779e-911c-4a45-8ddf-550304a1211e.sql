-- Re-create plans_public WITHOUT security_invoker so the view reads
-- the underlying `plans` table with the view owner's privileges.
-- The view continues to hide pipeline_config, model_id and other
-- internal columns from clients.
DROP VIEW IF EXISTS public.plans_public;

CREATE VIEW public.plans_public AS
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

-- Belt & suspenders: ensure the base table stays locked down to clients
REVOKE SELECT ON public.plans FROM anon, authenticated;